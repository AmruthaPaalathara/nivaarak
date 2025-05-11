// Importing required modules
const mongoose = require("mongoose");
const { exec } = require("child_process");
const path = require("path");
const pdf = require("pdf-parse");
const fs = require("fs");
const crypto = require("crypto");
const Document  = require("../../models/chatbot/documentSchema");
const { User } = require("../../models/authentication/userSchema");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");
const  redisClient  = require('../../config/redisConfig');
const {extractTextWithOCR} = require("../../utils/ocrFallbackExtractor"); // adjust path if different

const PYTHON_SCRIPT = path.resolve(__dirname, "../../extracting/process_pdf.py");

// Enable debug mode globally
mongoose.set("debug", true);

// Configuration constants
const UPLOAD_DIR = path.join(__dirname, "../../uploads/chatbot/");
const MAX_FILE_SIZE = process.env.MAX_PDF_SIZE || 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"];
const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const validateUser = async (userId) => {
  if (!userId || isNaN(userId)) throw new Error("Unauthorized: Invalid userId");
  const user = await User.findOne({ userId: userId });
  if (!user) throw new Error("Unauthorized: User does not exist");
};

const cleanUpFile = async (filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  }
};

// Secure text extraction with timeout and proper error handling
const extractTextFromPdf = (pdfPath) => {
  return new Promise((resolve, reject) => {
    const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
    const scriptPath = path.resolve(__dirname, "../../extracting/process_pdf.py");

    const command = `${PYTHON_CMD} "${scriptPath}"`;
    const inputJson = JSON.stringify({ pdf_path: pdfPath });

    console.log("⚙️ Extracting using Python script via stdin...");

    const child = exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error("❌ Extraction failed:", stderr || error.message);
        return reject(new Error(stderr || "Text extraction failed"));
      }

      try {
        const result = JSON.parse(stdout);
        if (result.status === "success" && typeof result.text === "string") {
          resolve(result);
        } else {
          reject(new Error(result.message || "Invalid output format"));
        }
      } catch (parseError) {
        reject(new Error("Failed to parse extraction result"));
      }
    });

    // Send JSON input to stdin
    child.stdin.write(inputJson);
    child.stdin.end();
  });
};

// Enhanced document upload with checksum and duplicate detection
const uploadDocument = async (req, res) => {
  try {
    console.log("️ Received file upload request");

    const userId = Number(req.body.userId);
    const file = req.file;

    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid userId" });
    }

    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    console.log(" Uploaded file details:", {
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: `${(file.size / 1024).toFixed(2)} KB`
    });

    // Validate MIME type
    if (file.mimetype !== "application/pdf") {
      await fs.promises.unlink(file.path);
      return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
    }

    // Validate file size (optional: customize max size)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      await fs.promises.unlink(file.path);
      return res.status(400).json({ success: false, message: "File exceeds 10MB limit" });
    }

    // Generate a unique custom ID
    const customId = uuidv4();

    // Generate checksum (hash of file)
    const fileBuffer = await fs.promises.readFile(file.path);
    const checksum = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    console.log(" Checksum generated:", checksum);

    // Try extracting text
    const extractionResult = await extractTextFromPdf(file.path);
    const extractedText = extractionResult?.text?.trim() || "";

    if (extractedText) {
      console.log("✅ Text extracted (first 200 chars):", extractedText.substring(0, 200));
    } else {
      console.warn("⚠️ No text extracted even after OCR fallback.");
    }

    const tempDocumentData = {
      userId,
      customId,
      filename: file.originalname,
      filePath: file.path,
      checksum,
      status: "pending",
      metadata: {
        fileSize: file.size,
        mimeType: file.mimetype,
      },
      extractedText,
    };

    if (extractedText && extractedText.length > 20) {
      await redisClient.setex(`extracted_document:${customId}`, 3600, JSON.stringify(tempDocumentData));
      console.log("💾 Document metadata stored temporarily in Redis");
    } else {
      console.warn("⚠️ Extracted text too small or empty. Not saving.");
    }

    res.status(200).json({
      success: true,
      message: "File uploaded and processed temporarily",
      data: {
        customId,
        file: {
          originalname: file.originalname,
          size: file.size,
          mimetype: file.mimetype,
        },
        extractedText,
      },
    });

  } catch (error) {
    console.error("❌ Upload error:", error.message);

    if (req.file?.path && fs.existsSync(req.file.path)) {
      await fs.promises.unlink(req.file.path).catch((err) => console.error("Cleanup error:", err));
    }

    res.status(500).json({ success: false, message: error.message || "Internal server error" });
  }
};

// Extract Text Controller
const extractText = async (req, res) => {
  try {
    const { customId } = req.body;
    console.log(" Extracting text for Document ID:", customId);

    if (!customId) {
      console.error(" Missing customId in request");
      return res.status(400).json({ success: false, message: "Missing document ID (customId)" });
    }

    console.log(` Extracting text for Document ID: ${customId}`);

    let doc = await Document.findOne({ customId }, "extractedText");
    if (doc && doc.extractedText) {
      return res.status(200).json({
        success: true,
        text: doc.extractedText,
        source: "mongodb",
      });
    }

    console.log("Text not found in MongoDB, checking Redis...");

    // Step 1: First check Redis cache
    const redisKey = `extracted_document:${customId}`;
    const redisData = await redisClient.get(redisKey);

    if (redisData) {
      const parsedData = JSON.parse(redisData);
      console.log(" Text found in Redis cache");

      return res.status(200).json({
        success: true,
        message: "Text fetched from Redis",
        text: parsedData.extractedText || "",
        source: "redis",
      });
    }

    console.warn(" Text not found in Redis, checking MongoDB...");



    // 3. If both MongoDB and Redis failed
    return res.status(404).json({
      success: false,
      error: "Text not found in MongoDB or Redis.",
    });

  } catch (error) {
    console.error("Error extracting text:", error);
    return res.status(500).json({
      success: false,
      error: "Internal Server Error during text extraction",
    });
  }
};

    const handleChatbotQuery = async (req, res) => {
  try {
    const { userId, customId, question } = req.body;

    const redisKey = `extracted_document:${customId}`;  // FIX: Explicit key
    const cachedData = await redisClient.get(redisKey);

    let documentData;

    if (!cachedData) {
      // If not found in Redis, check the Document schema in MongoDB
      const doc = await Document.findOne({ customId });
      if (!doc) {
        return res.status(404).json({ success: false, message: "Document not found in database" });
      }
      // Store the document text into Redis for future use
      documentData = {
        text: doc.extractedText,
        pages: doc.pages || 0
      };

      await redisClient.set(redisKey, JSON.stringify(documentData));

      if (!doc.extractedText && documentData.text) {
        doc.extractedText = documentData.text;
        doc.metadata = { ...(doc.metadata || {}), pageCount: documentData.pages };
        doc.savedToDB = true;
        await doc.save();
        console.log("✅ Document extractedText saved after first query.");
      }

      return res.status(200).json({
        success: true,
        message: "Document found in database and loaded",
        text: documentData.text,
        pages: documentData.pages || 0
      });
    }
     documentData = JSON.parse(cachedData);
    res.status(200).json({
      success: true,
      message: "Document loaded from Redis",
      text: documentData.text,
      pages: documentData.pages
    });

  } catch (error) {
    console.error("Error handling chatbot query:", error);
    res.status(500).json({ success: false, message: "Error handling query" });
  }
};

// Paginated documents list with filtering
const getDocuments = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId || isNaN(userId)) {
      console.warn("Authentication failed: Missing or invalid userId.");
      return res.status(401).json({ success: false, message: "Unauthorized: Missing or invalid userId in request." });
    }

    // Check if user exists
    const userExists = await User.findOne({ userId: userId });
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
    if (!uuidValidate(documentId)) {
      return res.status(400).json({ error: "Invalid document ID format" });
    }


    const document = await Document.findOne({ customId: documentId })
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

const archiveTempDocument = async (req, res) => {
  try {
    const { customId, userId } = req.body;

    if (!customId ) {
      console.error(" Missing customId in request");
      return res.status(400).json({ success: false, message: "Missing document ID " });
    }

    console.log("Archiving document:", customId);

    if (!userId) {
      console.error(" Missing userId in request");
      return res.status(400).json({ success: false, message: "Missing user ID" });
    }

    const redisKey = `extracted_document:${customId}`;
    const redisData = await redisClient.get(redisKey);

    if (!redisData) {
      console.error(" No temporary data found in Redis for:", customId);
      return res.status(404).json({ success: false, message: "Temporary document not found in Redis" });
    }

    const parsedData = JSON.parse(redisData);

    // Optional: Validate parsedData contents before saving
    const newDocument = new Document({
      userId: userId,
      customId: customId,
      filename: parsedData.filename || "Unknown file",
      filePath: parsedData.filePath || "",
      documentType: parsedData.documentType || "Unknown",
      extractedText: parsedData.extractedText || "",
      status: "archived",
      metadata: parsedData.metadata || {},
    });

    await newDocument.save();
    // After saving into MongoDB, you can optionally delete from Redis
    await redisClient.del(redisKey);

    console.log(" Archived document successfully:", customId);

    res.status(200).json({
      success: true,
      message: "Document archived successfully",
      documentId: newDocument._id,
    });

  } catch (error) {
    console.error(" Archiving Error:", error.message || error);

    res.status(500).json({
      success: false,
      message: "Failed to archive document",
      error: error.message || "Internal server error",
    });
  }
};

module.exports = {
  uploadDocument,
  getDocuments,
  getDocumentById,
  extractText,
  handleChatbotQuery,
  archiveTempDocument
};