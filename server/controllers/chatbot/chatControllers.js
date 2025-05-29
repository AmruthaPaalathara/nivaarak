//importing necessary modules
const express = require("express");
require("dotenv").config(); //loads envirinment variable //
const axios = require("axios"); //axios for calling API
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const { execFile } = require("child_process"); //
const fs = require("fs");
const path = require("path");
const pdfParse = require("pdf-parse");
const { body, validationResult } = require("express-validator");
const { handleError } = require("../../middleware/errorHandler.js");
const Document = require("../../models/chatbot/documentSchema.js");
const Chat = require("../../models/chatbot/chatSchema.js");
const router = express.Router();
const ChatArchive = require("../../models/chatbot/chatArchive.js");
const { User } = require("../../models/authentication/userSchema.js");
const redisClient = require("../../config/redisConfig");
const {callAIService} = require("../../utils/callAIService");

//ensuring that the message is not empty or whitespace
const validateChatMessage = [
  body("message")
      .trim()
      .notEmpty()
      .withMessage("Message cannot be empty")
      .custom((value) => {
        if (!value.replace(/\s/g, "").length) {
          throw new Error("Message cannot be whitespace only.");
        }
        return true;
      }),
  body("documentId")
      .optional()
      .isString()
      .withMessage("Invalid document ID"),
];


const textCache = new Map();

/**
 * POST /api/documents/extract-text
 * Check MongoDB → Redis → fallback OCR → persist → return text
 */
async function extractText(req, res) {
  try {
    const { customId } = req.body;
    if (!customId) {
      return res.status(400).json({ success: false, error: "Missing document ID (customId)" });
    }

    // 1) Try MongoDB
    let doc = await Document.findOne({ customId }).select("filePath extractedText");
    if (doc?.extractedText) {
      return res.json({ success: true, text: doc.extractedText, source: "mongodb" });
    }

    // 2) Try Redis
    const redisKey = `extracted_document:${customId}`;
    const cached = await redisClient.get(redisKey);
    console.log("🧊 Cached Redis entry:", cached);
    if (cached) {
      const { extractedText } = JSON.parse(cached);
      if (extractedText) {
        return res.json({ success: true, text: extractedText, source: "redis" });
      }
    }

    // 3) Fallback OCR
    if (!doc) {
      // If no Mongo record at all, we need at least the filePath
      return res.status(404).json({ success: false, error: "Document record not found." });
    }
    const pdfPath = path.resolve(__dirname, "../../", doc.filePath);
    console.log("⏩ No cached text—running fallback OCR on", pdfPath);

    const extractedText = await new Promise((resolve, reject) => {
      execFile(
          "python",
          [ path.resolve(__dirname, "../../OCR/process_chatbot_fallback.py"), pdfPath ],
          (err, stdout, stderr) => {
            if (err) {
              console.error("❌ Fallback OCR error:", stderr || err);
              return reject(err);
            }
            resolve(stdout.trim());
          }
      );
    });

    // 4) Persist into Mongo and Redis
    doc.extractedText = extractedText;
    await doc.save();
    await redisClient.set(redisKey, JSON.stringify({ extractedText }), "EX", 3600);

    // 5) Return the new text
    res.json({ success: true, text: extractedText, source: "ocr-fallback" });
  } catch (err) {
    console.error("❌ extractText error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error during text extraction" });
  }
}


/**
 * Run the chatbot-specific OCR fallback script on a PDF
 * @param {string} pdfPath - Absolute path to the PDF file
 * @returns {Promise<string>} - Extracted text
 */
async function extractForChatbot(pdfPath) {
  return new Promise((resolve, reject) => {
    execFile(
        "python",
        [path.resolve(__dirname, "../../OCR/process_chatbot_fallback.py"), pdfPath],
        (err, stdout, stderr) => {
          if (err) {
            console.error("Chatbot fallback OCR error:", stderr || err);
            return reject(err);
          }
          resolve(stdout.trim());
        }
    );
  });
}


/**
 * Fetch and prepare document context (extracted text) for the chatbot
 * @param {string} documentId
 * @param {string} userQuery
 * @returns {Promise<string>} - Relevant snippet or full text
 */
async function fetchDocumentContext(documentId, userQuery) {
  try {
    if (!documentId) throw new Error("Invalid document ID");

    const doc = await Document.findOne({ customId: documentId }).select(
        "filePath extractedText status"
    );
    if (!doc) throw new Error("Document not found");

    let fullText = doc.extractedText || "";

    // If temporary and no text, attempt primary parse + fallback
    if (doc.status === "temporary" && !fullText) {
      const pdfPath = path.resolve(__dirname, "../../", doc.filePath);
      console.log("🔍 Attempting primary PDF-parse for:", pdfPath);
      try {
        const dataBuffer = fs.readFileSync(pdfPath);
        const parsed = await pdfParse(dataBuffer);
        fullText = parsed.text.trim();
        console.log("✅ Primary PDF-parse succeeded (length:", fullText.length, ")");
      } catch (primaryErr) {
        console.error("❌ Primary PDF-parse failed:", primaryErr.message);
        console.log("⏩ Falling back to chatbot OCR script...");
        try {
          fullText = await extractForChatbot(pdfPath);
          console.log("✅ Chatbot OCR fallback succeeded (length:", fullText.length, ")");
        } catch (fallbackErr) {
          console.error(
              "❌ Chatbot OCR fallback also failed:",
              fallbackErr.message
          );
          fullText = "";
        }
      }
      doc.extractedText = fullText;
      doc.status = "permanent";
      await doc.save();
    }

    // If no user query, return snippet
    if (!userQuery || !userQuery.trim()) {
      return fullText.substring(0, 1000);
    }

    // Filter lines matching query terms
    const lowerQuery = userQuery.toLowerCase();
    const relevant = fullText
        .split("\n")
        .filter((line) =>
            lowerQuery
                .split(" ")
                .some((w) => line.toLowerCase().includes(w))
        )
        .join("\n");

    return relevant || fullText.substring(0, 1000);
  } catch (err) {
    console.error("Error fetching document context:", err.message);
    return "";
  }
}


// Process Chat Message
const handleChatMessage = async (req, res) => {
  try {
    console.log(" Received request body:", req.body);

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", message: "Validation failed", errors: errors.array(), });
    }

        // Extract userId from authenticated user session
        const userId = req.user?.id; // Assuming authentication middleware adds req.user
        if (!userId) {
          return res.status(401).json({
            status: "error",
            message: "Unauthorized: User must be logged in",
          });
        }

    //extracts msg,sessionId,documentId from req.bosy
    let { message, sessionId, documentId } = req.body;
    sessionId = sessionId || uuidv4();
    console.log("Using sessionId:", sessionId);


    // If a document is linked, retrieve its extracted text
    let contextSnippet = documentId ? await fetchDocumentContext(documentId, message) : "No document attached. Answer generally about government documents.";
    const aiPrompt = contextSnippet && contextSnippet.length > 30
        ? `Document Context:\n\n${contextSnippet.slice(0, 1000)}\n\nUser Query: ${message}`
        : message;

    // ✅ All logs before AI call
    console.log("📨 Session:", sessionId);
    console.log("📄 Document found:", !!docRecord); // will be undefined if no document
    console.log("🧠 Extracted length:", extractedText?.length);
    console.log("🗂️ History size:", chat?.messages?.length || 0);

    const aiResponse = await callAIService({
      userQuery: aiPrompt,
      lang: lang || "en",
      docContext: extractedText || "",
      history: previousMessages || [], // if you have this available
    });


    console.log("Saving chat messages:", { message, aiResponse });

    // Save chat
    await Chat.findOneAndUpdate(
        { sessionId, userId },
        {
          $push: {
            messages: [
              { role: "user", content: message },
              { role: "ai", content: aiResponse },
            ],
          },
          $setOnInsert: { documentId, createdAt: new Date() },
        },
        { upsert: true }
    );

    res.json({ success: true, message: aiResponse, sessionId });
  } catch (err) {
    console.error("Chat error:", err.stack || err.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};


const findRelevantText = (query, extractedText) => {
  const sentences = extractedText.split(". ");
  const cleanedQuery = query.toLowerCase().trim();

  return sentences.find((sentence) => sentence.toLowerCase().includes(cleanedQuery)) || "No relevant information found.";
};

const sendMessage = async (message, sessionId, documentId, userId) => {
  // Use provided sessionId or generate a new one using UUID
  const session = sessionId ? String(sessionId) : uuidv4();
  console.log(" Received message:", message);
  console.log(" Session ID:", session);
  console.log(" Document ID:", documentId || "No document attached");
  
  if (!userId) {
    console.error("Unauthorized: User must be logged in");
    throw new Error("Unauthorized: User must be logged in");
  }

  try {
    let context = "";
    if (documentId) {

      // Fetch the document's extracted text from the cache or database
      let document = await Document.findOne({ customId: documentId });

      if (!document) {
        // If the document doesn't exist, create a new record in the document schema
        const extractedData = await redisClient.get(`extracted_document:${documentId}`);
        if (extractedData) {
          document = new Document({
            customId: documentId,
            userId,
            extractedText: JSON.parse(extractedData).extractedText,
            status: "pending", // Status can be set as pending initially or processed later
          });
          await document.save();
        } else {
          console.error("No extracted data found for the document ID.");
          throw new Error("Document not found in cache.");
        }
      }

      // Fetch context (extracted text) from the document
      context = document.extractedText || "";
      console.log("Extracted Document Context:", context.substring(0, 200)); // Log first 200 chars
    }

    // Save the chat interaction
    let chat = await Chat.findOne({ userId, sessionId });

    if (!chat) {
      chat = new Chat({
        sessionId,
        userId,
        documentId: document ? document._id : null,
        messages: [{ role: "user", content: message }],
      });
      await chat.save();
    }

    // Extract only relevant text from document if present
    let relevantText = context ? findRelevantText(message, context) : "No relevant information found.";

    const aiPrompt = context ? `Document Content: ${relevantText}\n\nUser Query: ${message}` : message;

    // Fetch AI Response
    let aiResponse;
    try {
      // If you have the document context (extractedText), you can pass it here
      const contextSnippet = document.extractedText;  // Assuming you fetched the document's extracted text
      const userQuery = message;  // The user query (message)

      // Call the AI model with both parameters
      aiResponse = await callAIModel(contextSnippet, userQuery);
      console.log("AI Response:", aiResponse);
    } catch (aiError) {
      console.error("AI Service Error:", aiError.message);
      return { error: "Failed to get AI response." };
    }


    // Save the AI's response in the chat log
    chat.messages.push({ role: "user", content: message });
    chat.messages.push({ role: "ai", content: aiResponse });
    await chat.save();

    return { success: true, message: aiResponse, sessionId, chat };
  } catch (error) {
    console.error("Chatbot Error:", error.stack || error.message);
    return { error: "Internal Server Error" };
  }
};
const archiveChat = async (req, res) => {
  try {
    const { sessionId, userId, documentId } = req.body;

    // Fetch the chat session by sessionId
    const chatSession = await Chat.findOne({ sessionId });
    if (!chatSession) {
      return res.status(404).json({ success: false, message: "Chat session not found." });
    }

    // Filter out empty messages
    const cleanedMessages = chatSession.messages
        .filter(msg => msg && typeof msg === "object" && msg.content && msg.content.trim().length > 0)
        .map(msg => ({
          role: msg.role === "ai" ? "ai" : "user",
          message: msg.content.trim(),
          timestamp: msg.timestamp || new Date(),
        }));

    if (cleanedMessages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Cannot archive an empty chat session",
      });
    }

    // Check if documentId is valid (if provided)
    let linkedDocument = null;
    if (documentId) {
      linkedDocument = await Document.findOne({ customId: documentId });
      if (!linkedDocument) {
        return res.status(404).json({ error: "Document not found." });
      }
    }

    // Archive previous active chats of the user
    await ChatArchive.updateMany(
        { userId, status: "active" },
        { status: "archived", archivedAt: new Date() }
    );

    // Create a new chat archive entry
    const archive = new ChatArchive({
      userId, // Associate with user
      sessionId,
      chatHistory: cleanedMessages, // Ensure correct field name
      documentId: linkedDocument ? linkedDocument._id : null,
      status: "archived",
      archivedAt: new Date(),
    });

    // Set chat session status to archived
    chatSession.status = "archived";
    await chatSession.save();

    // Save the archive
    await archive.save();

    res.status(200).json({ success: true, data: archive });
  } catch (error) {
    console.error("Archiving error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to archive chat session",
    });
  }
};


module.exports = { handleChatMessage, fetchDocumentContext, sendMessage, archiveChat,  findRelevantText};