// Importing required modules
const mongoose = require("mongoose");
const { exec } = require("child_process");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const Document = require("../../models/chatbot/documentSchema");
const { User } = require("../../models/authentication/userSchema");

// Configuration constants
const UPLOAD_DIR = path.join(__dirname, "../../uploads");
const MAX_FILE_SIZE = process.env.MAX_PDF_SIZE || 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Secure text extraction with timeout and proper error handling
const extractTextFromPdf = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const scriptPath = path.resolve(__dirname, "../../extracting/process_pdf.py");
    const sanitizedPath = pdfPath.replace(/'/g, "\\'");
    const command = `${PYTHON_CMD} "${scriptPath}" "${sanitizedPath}"`;

    console.log(`Executing: ${command}`);

    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("Extraction failed:", stderr || error.message);
        reject(new Error(stderr || "Text extraction failed"));
        return;
      }

      try {
        const result = JSON.parse(stdout);
        if (result?.status === "success" && typeof result.text === "string") {
          resolve(result);
        } else {
          throw new Error("Invalid output format");
        }
      } catch (parseError) {
        reject(new Error("Failed to parse extraction results"));
      }
    });
  });
};
// Enhanced document upload with checksum and duplicate detection
const uploadDocument = async (req, res) => {
  try {

    const { customId, documentType } = req.body;
    const userId = Number(req.body.userId);


    // Ensure user is logged in
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid userId" });
    }

    // Check if user exists
    const userExists = await User.findOne({ userId });
    if (!userExists) {
      return res.status(401).json({ success: false, message: "Unauthorized: User does not exist" });
    }

    const existingCustomId = await Document.findOne({ customId });
    if (existingCustomId) {
      return res.status(400).json({ success: false, message: "customId already exists" });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded"
      });
    }

    console.log("Received Upload Request:", req.body);
    console.log("User ID in request:", req.body.userId);


    if (!ALLOWED_MIME_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: "Only PDF files are allowed"
      });
    }

    if (req.file.size > MAX_FILE_SIZE) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit`
      });
    }

    // Generate checksum
    const fileBuffer = fs.readFileSync(req.file.path);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");

    // Check for duplicate
    const existingDoc = await Document.findOne({ checksum });
    if (existingDoc) {
      fs.unlinkSync(req.file.path);
      return res.json({ success: true, message: "Document already exists", data: existingDoc });
    }

    // Process document
    const extractionResult = await extractTextFromPdf(req.file.path);
    if (!extractionResult.text) {
      throw new Error("No text extracted");
    }

    const newDocument = new Document({
      userId,
      customId,
      filename: req.file.originalname,
      filePath: req.file.path,
      checksum,
      status: "completed",
      metadata: {
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        pageCount: extractionResult.pages || 0
      },
      extractedText: extractionResult.text
    });


    console.log("Saving document to MongoDB...");
    try {
      const savedDoc = await newDocument.save();
      console.log("Document saved successfully:", savedDoc);
    } catch (error) {
      console.error("MongoDB Save Error:", error);
    }

    console.log("Checking saved document in DB...");
    const savedDocument = await Document.findById(newDocument._id);
    if (!savedDocument) {
      console.error("Document was not saved properly!");
    } else {
      console.log("Document verified in MongoDB:", savedDocument);
    }


    res.json({
      success: true,
      data: {
        id: newDocument._id,
        filename: newDocument.filename,
        status: newDocument.status,
        metadata: newDocument.metadata
      },
    });


  } catch (error) {
    console.error("Upload error:", error);
    if (req.file?.path) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: error.message || "Document processing failed" });
  }
};

const extractText = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Extract text from the uploaded document
    const extractionResult = await extractTextFromPdf(req.file.path);
    if (!extractionResult.text) {
      throw new Error("No text extracted");
    }

    res.json({
      success: true,
      text: extractionResult.text,
      pages: extractionResult.pages || 0
    });

  } catch (error) {
    console.error("Text extraction error:", error);
    res.status(500).json({ success: false, message: "Failed to extract text" });
  }
};


// Paginated documents list with filtering
const getDocuments = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid userId" });
    }

    // Check if user exists
    const userExists = await User.findOne({ userId });
    if (!userExists) {
      return res.status(401).json({ success: false, message: "Unauthorized: User does not exist" });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip = (page - 1) * limit;

    const query = { userId };
    if (req.query.status) {
      query.status = req.query.status;
    }

    const [total, documents] = await Promise.all([
      Document.countDocuments(query),
      Document.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("filename status createdAt metadata")
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error("List error:", error);
    res.status(500).json({
      error: "Failed to fetch documents"
    });
  }
};

// Secure document access
const getDocumentById = async (req, res) => {
  try {
    const { documentId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(documentId)) {
      return res.status(400).json({ error: "Invalid document ID" });
    }

    const document = await Document.findById(documentId)
      .select("-filePath -__v"); // Exclude sensitive fields

    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }

    res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({
      error: "Failed to fetch document"
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  extractText,
};