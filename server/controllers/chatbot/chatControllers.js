//importing necessary modules
const express = require("express");
require("dotenv").config(); //loads envirinment variable
const axios = require("axios"); //axios for calling API
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require("express-validator");
const { handleError } = require("../../middleware/errorHandler.js");
const Document = require("../../models/chatbot/documentSchema.js");
const Chat = require("../../models/chatbot/chatSchema.js");
const router = express.Router();
const ChatArchive = require("../../models/chatbot/chatArchive.js");
const { User } = require("../../models/authentication/userSchema.js");
const redisClient = require("../../config/redisConfig");
// const { summarize, chatCompletion } = require("../../utils/mt5Client")

//ensuring that the message is not empty or whitespace
const validateChatMessage = [
  body("message").trim().notEmpty().withMessage("Message cannot be empty").custom((value) => {
    if (!value.replace(/\s/g, "").length) { //prevents msgs that are only spaces.
      throw new Error("Message cannot be empty or whitespace only.");
    }
    return true;
  }),

  //if document id is provided, checks if it's a valid MongoDB ObjectId, converts it into a ObjectId
  body("documentId").optional().isMongoId().withMessage("Invalid document ID").customSanitizer((value) => value ? mongoose.Types.ObjectId(value) : null)
];

const textCache = new Map();

const summarizeText = async (text) => {
  try {
    // Directly call our mT5 summarize wrapper
    const summary = await summarize(text);
    return summary.trim();
  } catch (err) {
    console.error("mT5 Summarization error:", err);
    return text;  // fallback
  }
};

// Fetch Document Context and validating documentId is a valid objectId
const fetchDocumentContext = async (documentId, userQuery) => {
  try {
    if (!documentId || typeof documentId !== "string") {
      throw new Error("Invalid document ID");
    }

    const doc = await Document.findOne({ customId: documentId })
        .select("extractedText userId customId status"); // Include status

    if (!doc) {
      throw new Error("Document not found");
    }

    console.log("Fetched document for context:", doc);
    let fullText = doc.extractedText || "";

    // If the document is temporary, process it (extract text) and save it permanently
    if (doc.status === "temporary" && fullText === "") {
      // Trigger text extraction and saving logic here
      fullText = await extractTextFromDocument(doc); // Assume this function processes and returns text
      doc.extractedText = fullText;
      doc.status = "permanent"; // Change status to permanent
      await doc.save(); // Save it permanently
    }
    
    if (!userQuery || !userQuery.trim()) {
      return fullText.substring(0, 1000);
    }

    //returning the context (the extracted texts)
    
    const threshold = 5000;

    // If text is too long and summarizeText function is available, summarize it
    if (fullText.length > threshold) {
      console.log("Text length exceeds threshold. Summarizing...");
      fullText = await summarizeText(fullText);
    }
    // Extract relevant content using keyword matching
    const lowerQuery = userQuery.toLowerCase();
    const relevantLines = fullText.split("\n").filter((line) => lowerQuery.split(" ").some((word) => line.toLowerCase().includes(word)))
      .join("\n");

    // If no matching lines, use a truncated version of fullText
    // If no matching lines, return a truncated version of the fullText (first 1000 characters)
    return relevantLines || fullText.substring(0, 1000);
  } catch (error) {
    console.error("Error Application extracting text:", error.message);
    return "";
  }
};

const extractTextFromDocument = async (doc) => {
  try {
    if (!doc.filePath) {
      throw new Error("File path not provided");
    }

    const fileType = doc.mimeType; // Assuming 'mimeType' field in doc contains the document type
    let extractedText = "";

    // For PDF files, use a library like pdf-parse
    if (fileType === "application/pdf") {
      const pdfParse = require("pdf-parse");
      const fs = require("fs");

      const buffer = fs.readFileSync(doc.filePath);
      const pdfData = await pdfParse(buffer);
      extractedText = pdfData.text;

    }
    // For Image documents (e.g., scanned PDFs), use an OCR tool like Tesseract.js
    else if (fileType.startsWith("image/")) {
      const Tesseract = require("tesseract.js");

      const result = await Tesseract.recognize(doc.filePath, "eng", {
        logger: (m) => console.log(m), // Optional logger for progress
      });

      extractedText = result.data.text;
    }
    // Add additional logic for other file types if needed

    return extractedText;
  } catch (error) {
    console.error("Text extraction failed:", error.message);
    return "";
  }
};

// Call AI Model
const callAIModel = async (contextSnippet, userQuery) => {
  // Build a single concatenated prompt—feel free to tweak this template
  const aiPrompt = contextSnippet
      ? `Document Content: ${contextSnippet}\n\nUser Query: ${userQuery}`
      : userQuery;

  console.log("mT5 prompt:", aiPrompt);

  try {
    // chatCompletion uses the `google/mt5-base` under the hood
    const reply = await chatCompletion(aiPrompt);
    return reply;
  } catch (err) {
    console.error("mT5 chatCompletion error:", err);
    throw err;
  }
};

// Process Chat Message
const handleChatMessage = async (req, res) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ status: "error", message: "Validation failed", errors: errors.array() });
    }

    // Extract parameters
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ status: "error", message: "Unauthorized: User must be logged in" });
    }
    let { message, sessionId, documentId, useDocContext = false } = req.body;
    sessionId = sessionId || uuidv4();

    // Load document context if needed
    let context = "";
    if (documentId) {
      // fetch raw text or summary based on user query
      context = await fetchDocumentContext(documentId, message);
    }

    // Build AI prompt
    let aiPrompt = message;
    if (useDocContext && context) {
      const snippet = findRelevantText(message, context);
      aiPrompt = `Document Content: ${snippet}\n\nUser Query: ${message}`;
    }

    // Call Google mT5 model
    // Call Google mT5 model
    let aiResponse;
    try {
      if (useDocContext && context) {
        // Document‐aware prompt
        aiResponse = await contextualChatCompletion(context, message);
      } else {
        // Fallback to generic prompt
        aiResponse = await chatCompletion(message);
      }
    } catch (err) {
      console.error("mT5 Error:", err);
      return res.status(500).json({
        status: "error",
        message: "AI service unavailable.",
      });
    }

    // Persist chat messages
    const chat = await Chat.findOneAndUpdate(
        { sessionId },
        {
          $setOnInsert: { userId, documentId, createdAt: new Date() },
          $push: {
            messages: [
              { role: "user", content: message },
              { role: "ai", content: aiResponse }
            ]
          }
        },
        { upsert: true, new: true }
    );

    return res.json({ success: true, message: aiResponse, sessionId, documentId });
  } catch (error) {
    console.error("Chat error:", error);
    return res.status(500).json({ status: "error", message: error.message || "Failed to process message" });
  }
};

const findRelevantText = (query, extractedText) => {
  const sentences = extractedText.split(". ");
  const cleanedQuery = query.toLowerCase().trim();

  return sentences.find((sentence) => sentence.toLowerCase().includes(cleanedQuery)) || "No relevant information found.";
};

/**
 * Send a chat message, optionally using document context when useDocContext=true
 */
async function sendMessage( message, sessionId, documentId, userId, useDocContext = false)
{
  // Ensure we have a session
  const session = sessionId ? String(sessionId) : uuidv4();

  // Must be logged in
  if (!userId) throw new Error("Unauthorized: User must be logged in");

  // 1) Fetch or restore document & its extracted text
  let context = "";
  if (documentId) {
    let doc = await Document.findOne({ customId: documentId });
    if (!doc) {
      const cached = await redisClient.get(`extracted_document:${documentId}`);
      if (!cached) throw new Error("Document not found in cache or DB");
      const parsed = JSON.parse(cached);
      doc = new Document({
        customId:     documentId,
        userId,
        extractedText: parsed.extractedText,
        status:       "pending",
      });
      await doc.save();
    }
    context = doc.extractedText || "";
  }

  // 2) Upsert the Chat session (so it exists before we push)
  let chat = await Chat.findOne({ userId, sessionId: session });
  if (!chat) {
    chat = new Chat({
      sessionId: session,
      userId,
      documentId: documentId ? doc._id : null,
      messages: [{ role: "user", content: message }],
    });
    await chat.save();
  }

  // 3) Decide whether to build a document‐based prompt
  let aiPrompt = message;
  if (useDocContext && context) {
    const relevantText = findRelevantText(message, context);
    aiPrompt = `Document Content: ${relevantText}\n\nUser Query: ${message}`;
  }

  // 4) Call the AI model
  let aiResponse;
  try {
    aiResponse = await callAIModel(context, message); // or pass aiPrompt to callAIModel if it accepts custom prompt
  } catch (err) {
    console.error("AI Service Error:", err);
    throw new Error("Failed to get AI response");
  }

  // 5) Persist both user & AI messages
  chat.messages.push({ role: "user", content: message });
  chat.messages.push({ role: "ai",  content: aiResponse });
  await chat.save();

  return { success: true, message: aiResponse, sessionId: session, chat };
}

const archiveChat = async (req, res) => {
  try {
    const { sessionId, userId, documentId } = req.body;
    if (!sessionId || !userId) {
      return res.status(400).json({ success: false, message: "Missing sessionId or userId" });
    }

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


module.exports = { handleChatMessage, fetchDocumentContext, callAIModel, sendMessage, archiveChat,  findRelevantText};