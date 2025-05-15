

const mongoose = require("mongoose");
const { exec } = require("child_process");
const path     = require("path");
const fs       = require("fs");
const crypto   = require("crypto");
const { v4: uuidv4, validate: uuidValidate } = require("uuid");
const redisClient = require("../../config/redisConfig");
const Document    = require("../../models/chatbot/documentSchema");
const { User }    = require("../../models/authentication/userSchema");
const { extractTextWithOCR } = require("../../utils/ocrFallbackExtractor");

// Enable debug logging for Mongoose
mongoose.set("debug", true);

// Configuration
const UPLOAD_DIR           = path.join(__dirname, "../../uploads/chatbot/");
const MAX_FILE_SIZE_BYTES  = parseInt(process.env.MAX_PDF_SIZE) || 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES   = ["application/pdf"];

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Validate user existence
async function validateUser(userId) {
  if (!userId || isNaN(userId)) {
    throw new Error("Unauthorized: Invalid userId");
  }
  const user = await User.findOne({ userId });
  if (!user) {
    throw new Error("Unauthorized: User does not exist");
  }
}

// Cleanup file helper
async function cleanUpFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try {
      await fs.promises.unlink(filePath);
    } catch (_) {}
  }
}

// 1. Upload document, extract text, cache in Redis
async function uploadDocument(req, res) {
  let filePath;
  try {
    const userId = Number(req.body.userId);
    await validateUser(userId);

    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }
    filePath = file.path;

    // Validate MIME type and size
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      await cleanUpFile(filePath);
      return res.status(400).json({ success: false, message: "Only PDF files are allowed" });
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      await cleanUpFile(filePath);
      return res.status(400).json({ success: false, message: "File exceeds size limit" });
    }

    // Generate identifiers
    const customId = uuidv4();
    const buffer   = await fs.promises.readFile(filePath);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");

    // Extract text using OCR fallback
    let extractedText = "";
    try {
      const result = await extractTextWithOCR(filePath);
      extractedText = (result.text || "").trim();
    } catch (err) {
      console.warn("OCR error:", err.message);
    }

    // Cache temporarily in Redis
    const tempData = { userId, customId, filename: file.originalname,
      filePath, checksum, status: "pending",
      metadata: { fileSize: file.size, mimeType: file.mimetype }, extractedText };
    if (extractedText.length > 20) {
      await redisClient.setex(`extracted_document:${customId}`, 3600, JSON.stringify(tempData));
    }

    res.json({ success: true, data: { customId, extractedText } });
  } catch (err) {
    console.error("uploadDocument error:", err);
    if (filePath) await cleanUpFile(filePath);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 2. Extract text endpoint: check MongoDB then Redis
async function extractText(req, res) {
  try {
    const { customId } = req.body;
    if (!customId) {
      return res.status(400).json({ success: false, message: "Missing customId" });
    }

    // Try MongoDB
    const doc = await Document.findOne({ customId }).select("extractedText");
    if (doc && doc.extractedText) {
      return res.json({ success: true, text: doc.extractedText, source: "mongodb" });
    }

    // Try Redis
    const redisKey = `extracted_document:${customId}`;
    const cached  = await redisClient.get(redisKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      return res.json({ success: true, text: parsed.extractedText, source: "redis" });
    }

    res.status(404).json({ success: false, message: "Text not found" });
  } catch (err) {
    console.error("extractText error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 3. Chatbot query: load from Redis or MongoDB
async function handleChatbotQuery(req, res) {
  try {
    const { customId, userId, question } = req.body;
    if (!customId || !userId || !question) {
      return res.status(400).json({ success: false, message: "Missing parameters" });
    }
    await validateUser(Number(userId));

    const redisKey = `extracted_document:${customId}`;
    let data = await redisClient.get(redisKey);

    if (!data) {
      const d = await Document.findOne({ customId });
      if (!d) {
        return res.status(404).json({ success: false, message: "Document not found" });
      }
      data = JSON.stringify({ text: d.extractedText, pages: d.metadata?.pageCount || 0 });
      await redisClient.set(redisKey, data);
      if (!d.extractedText) {
        d.extractedText = JSON.parse(data).text;
        await d.save();
      }
    }

    const { text, pages } = JSON.parse(data);
    res.json({ success: true, text, pages });
  } catch (err) {
    console.error("handleChatbotQuery error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 4. List documents with pagination
async function getDocuments(req, res) {
  try {
    const userId = Number(req.query.userId);
    await validateUser(userId);

    const page  = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 50);
    const skip  = (page - 1) * limit;

    const query = { userId };
    if (req.query.status) query.status = req.query.status;

    const [total, docs] = await Promise.all([
      Document.countDocuments(query),
      Document.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select("filename status createdAt metadata")
    ]);

    res.json({ success: true, data: docs, pagination: { total, page, limit, pages: Math.ceil(total/limit) } });
  } catch (err) {
    console.error("getDocuments error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 5. Fetch single document by customId
async function getDocumentById(req, res) {
  try {
    const { documentId } = req.params;
    if (!uuidValidate(documentId)) {
      return res.status(400).json({ success: false, message: "Invalid document ID" });
    }
    const doc = await Document.findOne({ customId: documentId }).select("-filePath -__v");
    if (!doc) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    console.error("getDocumentById error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// 6. Archive temp document from Redis to MongoDB
async function archiveTempDocument(req, res) {
  try {
    const { customId, userId } = req.body;
    await validateUser(Number(userId));

    const redisKey = `extracted_document:${customId}`;
    const cached  = await redisClient.get(redisKey);
    if (!cached) {
      return res.status(404).json({ success: false, message: "Temporary document not found" });
    }
    const parsed = JSON.parse(cached);

    const newDoc = new Document({
      userId: Number(userId),
      customId,
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
    console.error("archiveTempDocument error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  uploadDocument,
  extractText,
  handleChatbotQuery,
  getDocuments,
  getDocumentById,
  archiveTempDocument
};