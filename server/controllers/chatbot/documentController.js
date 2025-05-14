// server/controllers/chatbot/documentController.js

const mongoose = require("mongoose");
const { exec } = require("child_process");
const path     = require("path");
const pdfParse = require("pdf-parse");
const fs       = require("fs");
const crypto   = require("crypto");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");
const redisClient = require("../../config/redisConfig");
const Document    = require("../../models/chatbot/documentSchema");
const { User }    = require("../../models/authentication/userSchema");
const { extractTextWithOCR } = require("../../utils/ocrFallbackExtractor");

// Enable detailed Mongoose debug logging
mongoose.set("debug", true);

// Constants
const UPLOAD_DIR    = path.join(__dirname, "../../uploads/chatbot/");
const MAX_FILE_SIZE = parseInt(process.env.MAX_PDF_SIZE) || 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ["application/pdf"];

// Ensure upload dir exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Helper: validate user existence
async function validateUser(userId) {
  if (!userId || isNaN(userId)) throw new Error("Unauthorized: Invalid userId");
  const u = await User.findOne({ userId });
  if (!u) throw new Error("Unauthorized: User does not exist");
}

// Helper: cleanup a file
async function cleanUpFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try { await fs.promises.unlink(filePath); } catch {};
  }
}

// 1. Upload document, extract text via OCR fallback, cache in Redis
async function uploadDocument(req, res) {
  let filePath;
  try {
    const userId = Number(req.body.userId);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid userId" });
    }
    await validateUser(userId);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    filePath = file.path;

    // Validate type & size
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      await cleanUpFile(filePath);
      return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
    }
    if (file.size > MAX_FILE_SIZE) {
      await cleanUpFile(filePath);
      return res.status(400).json({ success: false, message: "File exceeds 10MB limit" });
    }

    // Generate IDs & checksum
    const customId = uuidv4();
    const buffer   = await fs.promises.readFile(filePath);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // OCR fallback extraction
    let extractedText = "";
    try {
      const result = await extractTextWithOCR(filePath);
      extractedText = (result.text || "").trim();
      console.log("✅ OCR text extracted (first 200 chars):", extractedText.substring(0,200));
    } catch (e) {
      console.warn("⚠️ OCR fallback error:", e.message);
      extractedText = "";
    }

    // Cache temporarily in Redis
    const tempData = { userId, customId, filename: file.originalname,
      filePath, checksum, status: "pending",
      metadata: { fileSize: file.size, mimeType: file.mimetype },
      extractedText };
    if (extractedText.length > 20) {
      await redisClient.setex(`extracted_document:${customId}`, 3600, JSON.stringify(tempData));
      console.log("💾 Temporary document saved in Redis");
    } else {
      console.warn("⚠️ Extracted text too short; not caching in Redis");
    }

    res.json({ success: true,
      message: "File uploaded and processed temporarily",
      data: { customId, originalname: file.originalname, extractedText } });
  } catch (err) {
    console.error("❌ uploadDocument error:", err);
    if (filePath) await cleanUpFile(filePath);
    res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
}

// 2. Extract text endpoint: check MongoDB then Redis
async function extractText(req, res) {
  try {
    const { customId } = req.body;
    if (!customId) {
      return res.status(400).json({ success: false, message: "Missing document ID (customId)" });
    }

    // Try MongoDB
    const doc = await Document.findOne({ customId }).select("extractedText");
    if (doc && doc.extractedText) {
      return res.json({ success: true, text: doc.extractedText, source: "mongodb" });
    }

    // Try Redis
    const redisKey = `extracted_document:${customId}`;
    const cached = await redisClient.get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({ success: true, text: parsed.extractedText || "", source: "redis" });
    }

    res.status(404).json({ success: false, error: "Text not found in MongoDB or Redis." });
  } catch (err) {
    console.error("❌ extractText error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error during text extraction" });
  }
}

// 3. Chatbot query: load from Redis or MongoDB, cache and persist if needed
async function handleChatbotQuery(req, res) {
  try {
    const { customId, userId, question } = req.body;
    if (!customId || !userId || !question) {
      return res.status(400).json({ success: false, message: "Missing customId, userId, or question" });
    }

    // Ensure user exists
    await validateUser(Number(userId));

    const redisKey = `extracted_document:${customId}`;
    let data = await redisClient.get(redisKey);

    if (!data) {
      // Fallback to MongoDB
      const d = await Document.findOne({ customId });
      if (!d) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      data = JSON.stringify({ extractedText: d.extractedText, pages: d.metadata?.pageCount || 0 });
      await redisClient.set(redisKey, data);

      if (!d.extractedText) {
        d.extractedText = JSON.parse(data).extractedText;
        await d.save();
      }
    }

    const { extractedText, pages } = JSON.parse(data);
    res.json({ success: true, text: extractedText, pages, source: data ? "redis" : "mongodb" });
  } catch (err) {
    console.error("❌ handleChatbotQuery error:", err);
    res.status(500).json({ success: false, message: "Error handling chatbot query" });
  }
}

// 4. List documents with pagination & optional status filter
async function getDocuments(req, res) {
  try {
    const userId = Number(req.query.userId);
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Missing or invalid userId" });
    }
    await validateUser(userId);

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    const query = { userId };
    if (req.query.status) query.status = req.query.status;

    const [ total, docs ] = await Promise.all([
      Document.countDocuments(query),
      Document.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("filename status createdAt metadata")
    ]);

    res.json({ success: true,
      data: docs,
      pagination: { total, page, limit, pages: Math.ceil(total/limit) }
    });
  } catch (err) {
    console.error("❌ getDocuments error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch documents" });
  }
}

// 5. Fetch single document by customId
async function getDocumentById(req, res) {
  try {
    const { documentId } = req.params;
    if (!uuidValidate(documentId)) {
      return res.status(400).json({ error: "Invalid document ID format" });
    }
    const doc = await Document.findOne({ customId: documentId }).select("-filePath -__v");
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("❌ getDocumentById error:", err);
    res.status(500).json({ error: "Failed to fetch document" });
  }
}

// 6. Archive temp document from Redis into MongoDB
async function archiveTempDocument(req, res) {
  try {
    const { customId, userId } = req.body;
    if (!customId || !userId) {
      return res.status(400).json({ success: false, message: "Missing customId or userId" });
    }

    await validateUser(Number(userId));
    const redisKey = `extracted_document:${customId}`;
    const data = await redisClient.get(redisKey);
    if (!data) {
      return res.status(404).json({ success: false, message: "Temporary document not found in Redis" });
    }
    const parsed = JSON.parse(data);

    const newDoc = new Document({
      userId: Number(userId), customId,
      filename: parsed.filename || "",
      filePath: parsed.filePath || "",
      documentType: parsed.documentType || null,
      extractedText: parsed.extractedText || "",
      status: "archived",
      metadata: parsed.metadata || {}
    });
    await newDoc.save();
    await redisClient.del(redisKey);

    res.json({ success: true, message: "Document archived successfully", documentId: newDoc._id });
  } catch (err) {
    console.error("❌ archiveTempDocument error:", err);
    res.status(500).json({ success: false, message: "Failed to archive document" });
  }
}

module.exports = {
  uploadDocument,
  extractText,
  handleChatbotQuery,
  getDocuments,
  getDocumentById,
  archiveTempDocument,
};
