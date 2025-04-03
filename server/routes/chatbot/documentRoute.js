//importing required libraries
const express = require("express"); //used to create API routes
const multer = require("multer"); //middleware for handling file uploads
const { uploadDocument, extractText, getDocuments, getDocumentById } = require("../../controllers/chatbot/documentController.js");
const fs = require('fs'); // Add this line to import the fs module
const path = require('path');  // Import the 'path' module
const { v4: uuidv4 } = require("uuid");
const { extractTextFromPDF } = require("../../utils/pdfExtractor");

const router = express.Router();
const uploadFolder = path.join(__dirname, "../../uploads");

// Ensure the upload folder exists
fs.mkdirSync(uploadFolder, { recursive: true });


//  Configure Multer for File Uploads (Disk Storage)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadFolder),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

//  Set file size limit (10MB)
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (!file.originalname.toLowerCase().endsWith(".pdf") || file.mimetype !== "application/pdf") {
      return cb(new Error("Only PDF files are allowed"), false);
    }
    cb(null, true);
  }
});


// Middleware: Validate File Type
const validateFileType = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const filePath = req.file.path;
    if (!fs.existsSync(filePath)) return res.status(500).json({ error: "Uploaded file not found on server" });

    const fileBuffer = await fs.promises.readFile(filePath);

    // Dynamically import file-type
    const fileType = await import("file-type");
    const type = await fileType.fileTypeFromBuffer(fileBuffer);

    if (!type || type.mime !== "application/pdf") {
      fs.unlink(filePath, (err) => err && console.error("Error deleting invalid file:", err));
      return res.status(400).json({ error: "Invalid PDF file format" });
    }

    next();
  } catch (error) {
    console.error("File validation error:", error);
    return res.status(500).json({ error: "Error processing file" });
  }
};

const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "File upload error: " + err.message });
  } else if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
};



router.use(handleMulterErrors);

/**
 * @route   POST /api/documents/upload
 * @desc    Upload a PDF document (No authentication Required)
 * @access  Public
 */
router.post("/upload", upload.single("file"), handleMulterErrors, validateFileType, async (req, res) => { //only 1 file at a time can be uploaded
  console.log("Received upload request:", req.body);
  if (!req.body.userId) {
    console.error("User ID is missing. Authentication issue?");
    return res.status(401).json({ error: "Unauthorized: Missing User ID" });
  }

  console.log("Received file:", req.file);

  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

    console.log("File uploaded successfully:", req.file);
try {
    const documentId = uuidv4(); // Generate a unique ID
    const extractedText = await extractTextFromPDF(req.file.path); // Extract text from PDF

    return res.json({
      success: true,
      message: "File uploaded successfully",
      data: {
        customId: documentId,
        extractedText: extractedText || "No text extracted",
        file: req.file, // Keep original file metadata
      },
    });

  } catch (error) {
    console.error(" File upload error:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

/**
 * @route   GET /api/documents/
 * @desc    Fetch uploaded documents for the authenticated user (No authentication Required)
 * @access  Public
 */
router.get("/", getDocuments);

/**
 * @route   GET /api/documents/:documentId
 * @desc    Get a document by ID
 * @access  Public
 */
router.get("/:documentId", getDocumentById);

/**
 * @route   POST /api/documents/extract-text
 * @desc    Extract text from an uploaded document
 * @access  Public
 */
router.post("/extract-text", extractText);


module.exports = { router, upload };
