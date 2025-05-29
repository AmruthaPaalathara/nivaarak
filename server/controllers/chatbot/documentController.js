
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
const { extractTextWithOCR } = require("../../utils/chatbotOcrExtractor");
const {callAIService} = require("../../utils/callAIService");

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
  const numericUserId = Number(userId);
  console.log("Looking for userId:", numericUserId, "Type:", typeof numericUserId);

  if (!numericUserId || isNaN(numericUserId)) {
    throw new Error("Unauthorized: Invalid userId");
  }

  const u = await User.findOne({ userId: numericUserId });
  if (!u) {
    throw new Error("Unauthorized: User does not exist");
  }
}

// Helper: cleanup a file
async function cleanUpFile(filePath) {
  if (filePath && fs.existsSync(filePath)) {
    try { await fs.promises.unlink(filePath); } catch {};
  }
}

/**
 * @param {Buffer} buffer
 * @returns {Promise<string>}
 */
async function extractTextFast(buffer) {
  const { text } = await pdfParse(buffer);
  return text.trim();
}


async function extractTextWithFallback(path) {
  const buffer = fs.readFileSync(path);
  const { text } = await pdfParse(buffer);
  if (text.length > 20) return text;
  // only then call your Python OCR
  const { text: ocrText } = await extractTextWithOCR(path);
  return ocrText.trim();
}

// 1. Upload document, extract text via OCR fallback, cache in Redis
async function uploadDocument(req, res) {
  let filePath;
  try {
    const userId = Number(req.body.userId);
    await validateUser(userId);

    const file = req.file;
    if (!file) return res.status(400).json({ success: false, message: "No file uploaded" });

    filePath = file.path;
    const buffer = await fs.promises.readFile(filePath);
    const checksum = crypto.createHash("sha256").update(buffer).digest("hex");
    const customId = uuidv4();

    // Run OCR fallback on the uploaded PDF
    let extractedText = "";
    try {
      const text = await extractTextWithFallback(filePath);
      if (text?.length > 20) extractedText = text.trim();
      console.log(`✅ OCR fallback text length: ${extractedText.length}`);
    } catch (ocrErr) {
      console.warn(" OCR fallback error:", ocrErr.message);
    }

    // Cache in Redis for 1 hour
    const tempData = {
      userId,
      customId,
      filePath,
      filename: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      checksum,
      status: "pending",
      extractedText
    };

    if (extractedText.length > 0) {
      await redisClient.setex(`extracted_document:${customId}`, 3600, JSON.stringify(tempData));
    }
    console.log(" Cached in Redis for document controller.js file:", customId);

  return res.json({
    success: true,
    data: {
      customId,
      filename: file.originalname,
      extractedText,

    },
  });
  } catch (err) {
    console.error("❌ uploadDocument error:", err);
    if (filePath) await cleanUpFile(filePath);
    return res.status(500).json({ success: false, message: err.message || "Internal server error" });
  }
}

/**
 * 2. Extract text endpoint: MongoDB -> Redis -> OCR fallback -> persist -> return
 */
/**
 * @route   POST /api/chat/documents/extract-text
 * @desc    Extract text: Redis → MongoDB → OCR fallback
 * @access  private (authentication required)
 */
async function extractText(req, res) {
  try {
    const { customId } = req.body;
    if (!customId) {
      return res
          .status(400)
          .json({ success: false, error: "Missing document ID" });
    }

    // Build the Redis key and try to fetch cached payload
    const redisKey = `extracted_document:${customId}`;
    const cached = await redisClient.get(redisKey);

    console.log("🔎 extractText for customId:", customId);
    console.log("🧊 Redis entry:", cached);

    // 1️⃣ Redis: return cached text (even if empty)
    if (cached) {
      const { extractedText = "" } = JSON.parse(cached);
      return res.json({
        success: true,
        text: extractedText,
        source: "redis",
      });
    }

    // 2️⃣ MongoDB: check for a saved document
    const doc = await Document.findOne({ customId }).select(
        "extractedText filePath"
    );
    if (doc && doc.extractedText != null) {
      return res.json({
        success: true,
        text: doc.extractedText,
        source: "mongodb",
      });
    }

    // 3️⃣ OCR fallback: if we know the file path, run OCR
    if (doc && doc.filePath) {
      const { status, text } = await extractTextWithOCR(doc.filePath);

      // (Optional) Cache this new OCR result back to Redis:
      // await redisClient.setex(redisKey, 3600, JSON.stringify({
      //   extractedText: text,
      //   filePath: doc.filePath
      // }));

      return res.json({
        success: true,
        text,
        source: "ocr-fallback",
      });
    }

    // Nothing found anywhere
    return res
        .status(404)
        .json({
          success: false,
          error: "Text not found in Redis, MongoDB, or via OCR fallback.",
        });
  } catch (err) {
    console.error("❌ extractText error:", err);
    return res
        .status(500)
        .json({ success: false, error: "Internal server error." });
  }
}

// 3. Chatbot query: load from Redis or MongoDB, cache and persist if needed
async function handleChatbotQuery(req, res) {
  try {
    const { customId, userId, question } = req.body;
    if (!customId || !userId || !question) {
      return res
          .status(400)
          .json({ success: false, message: "Missing customId, userId, or question" });
    }

    // Ensure the user exists
    await validateUser(Number(userId));

    const redisKey = `extracted_document:${customId}`;
    const cached = await redisClient.get(redisKey);

    if (cached) {
      // Parse the cached payload
      const { extractedText, filename, filePath, checksum, status } = JSON.parse(cached);

      // Archive into MongoDB (only once)
      try {
        // Avoid duplicating if already in Mongo
        const exists = await Document.findOne({ customId });
        if (!exists) {
          await new Document({
            userId: Number(userId),
            customId,
            filename,
            filePath,
            checksum,
            status: "archived",
            extractedText
          }).save();
        }
        // Remove the Redis key so next time we hit DB
        await redisClient.del(redisKey);
        console.log(`📦 Archived ${customId} to MongoDB & cleared Redis`);
      } catch (archiveErr) {
        console.error(`❌ Failed to archive ${customId}:`, archiveErr);
      }

      return res.json({
        success: true,
        text: extractedText,
        source: "redis"
      });
    }

    // No Redis cache – try MongoDB
    const doc = await Document.findOne({ customId });
    if (doc?.extractedText) {
      return res.json({
        success: true,
        text: doc.extractedText,
        source: "mongodb"
      });
    }

    // As a last resort, run OCR fallback on disk
    let ocrPath = (doc && doc.filePath) || null;
    if (!ocrPath) {
      return res
          .status(404)
          .json({ success: false, message: "Document not found for OCR fallback" });
    }

    const { status: ocrStatus, text: ocrText } = await extractTextWithOCR(ocrPath);
    return res.json({
      success: true,
      text: ocrText,
      source: "ocr-fallback"
    });

  } catch (err) {
    console.error("❌ handleChatbotQuery error:", err);
    return res
        .status(500)
        .json({ success: false, message: "Error handling chatbot query" });
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
    console.error(" getDocumentById error:", err);
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

    console.log("📦 Archiving document to MongoDB from Redis key:", redisKey);


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
    console.log("✅ Document saved to MongoDB with ID:", newDoc._id);

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
