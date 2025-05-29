//importing required libraries
const express = require("express"); //used to create API routes
const multer = require("multer"); //middleware for handling file uploads
const { uploadDocument, extractText, getDocuments, getDocumentById, archiveTempDocument  } = require("../../controllers/chatbot/documentController.js");
const fs = require('fs'); // Add this line to import the fs module
const path = require('path');  // Import the 'path' module
const { v4: uuidv4 } = require("uuid");
const { extractTextWithOCR } = require("../../utils/chatbotOcrExtractor");
const router = express.Router();
const uploadFolder = path.join(__dirname, "../../uploads/chatbot/");
const { chatbotUpload, handleUploadErrors } = require("../../middleware/multerConfigs");

const isAuthenticated = require("../../middleware/authenticationMiddleware");
const {authenticateJWT} = require("../../middleware/authenticationMiddleware/authMiddleware");

// Ensure the upload folder exists
fs.mkdirSync(uploadFolder, { recursive: true });

//  Configure Multer for File Uploads (Disk Storage)
const storage = multer.diskStorage( {
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
 * @route   POST /api/chat/documents/upload
 * @desc    Upload a PDF document (No authentication Required)
 * @access  Private (authentication is required)
 */
router.post(
    "/upload",
    authenticateJWT(),
    chatbotUpload.single("file"),
    handleMulterErrors,
    validateFileType,
    uploadDocument   // ← here's the switch
);

/**
 * @route   GET /api/chat/documents/
 * @desc    Fetch uploaded documents for the authenticated user (authentication Required)
 * @access  Private (authentication is required)
 */
router.get("/", isAuthenticated, getDocuments);

/**
 * @route   GET /api/chat/documents/:documentId
 * @desc    Get a document by ID
 * @access  Private (authentication is required)
 */
router.get("/:documentId", isAuthenticated, getDocumentById);

/**
 * @route   POST /api/documents/extract-text
 * @desc    Extract text from an uploaded document
 * @access  Private (authentication is required)
 */


// Log‐and‐continue middleware
function logExtractHit(req, res, next) {
  console.log("🔔 /extract-text endpoint hit for customId:", req.body.customId);
  next();
}

router.post("/extract-text", logExtractHit, extractText);

router.post("/archive-temp", isAuthenticated, archiveTempDocument);


module.exports = router;

