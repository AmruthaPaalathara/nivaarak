//importing required modules
require("dotenv").config();
const axios = require("axios");
const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const chatController = require("../../controllers/chatbot/chatControllers.js");
const { extractText } = require("../../controllers/chatbot/documentController.js");
const Chat = require("../../models/chatbot/chatSchema.js");
const Document = require("../../models/chatbot/documentSchema.js");
const  redisClient   = require("../../config/redisConfig");
const { findRelevantText } = require("../../controllers/chatbot/chatControllers")
const { v4: uuidv4 } = require("uuid");

const callAIService = async (userMessage) => {
  try {
    console.log("Calling local Groq server with message:", userMessage);

    if (!process.env.GROQ_API_KEY) {
      console.error("Missing GROQ_API_KEY. AI service cannot function.");
      return "AI service is temporarily unavailable.";
    }

    console.log("Calling AI Service with message:", userMessage);
    console.log("Using API Key:", process.env.GROQ_API_KEY);
    console.log("Loaded API Key:", process.env.GROQ_API_KEY ? "✅ Exists" : "❌ Missing");


    // Simulating AI Call (Replace with actual API call)
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: userMessage }],
      },
      {
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
      }
    );

    console.log("AI Response Data:", response.data);
    return response.data.choices[0]?.message?.content || "AI response missing content.";
  } catch (error) {
    console.error("Groq AI Service Error:", error.response?.data || error.message);
    return "AI service is temporarily unavailable.";
  }
};


/**
 * @route   POST /api/chat/start-chatbot
 * @desc    Start a new chat session or continue an existing one,
 *          ensuring documentId is linked when provided.
 * @access  Public (No authentication required)
 */

//start a chat session
router.post("/start-chat", async (req, res) => {
  try {
    let { sessionId, userId, documentId, message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    let linkedDocument = null;
    if (documentId) {
      // Retrieve the document from the database to get its ObjectId
      linkedDocument = await Document.findOne({ customId: documentId });

      if (!linkedDocument) {
        return res.status(404).json({ error: "Document not found." });
      }
    }

    if (!sessionId) {
      sessionId = sessionId || uuidv4();
    }

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    let chatSession = await Chat.findOne({ sessionId });
    if (!chatSession) {
      chatSession = new Chat({
        sessionId,
        userId: userId,
        documentId: linkedDocument ? linkedDocument._id : null,
        status: "active",
        messages: [{ role: "user", content: message }],
      });
    } else {
      if (documentId && !chatSession.documentId) {
        chatSession.documentId = linkedDocument._id;
      }
      chatSession.messages.push({ role: "user", content: message });
    }

    await chatSession.save();
    res.status(200).json({ success: true, message: "Chat session updated.", chatSession });
  } catch (error) {
    console.error("Error starting chat:", error);
    res.status(500).json({ error: "Internal server error." });
  }
});

/**
 * @route   POST /api/chat/send
 * @desc    Send a message to the chatbot. If the chat is document-related,
 *          retrieve the extracted text from the document and attach it as context
 *          (if not already provided) before processing the user's message.
 * @access  Public
 */
router.post("/send", async (req, res) => {
  console.log("Received query:", req.body.message);
  console.log("Checking document association:", req.body.documentId);

  try {
    let { message, sessionId, documentId, userId } = req.body;
    console.log("Received chat request:", req.body);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required." });
    }

    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Message cannot be empty." });
    }

    // Ensure sessionId is always a string
    if (!sessionId) {

      sessionId = sessionId || uuidv4();
    }

    let chat = await Chat.findOne({ userId, sessionId });
    if (!chat) {
      let document = documentId ? await Document.findOne({ customId: documentId }) : null;

      if (documentId && !document) {
        // If the document is not found in the database, fetch from cache and save
        const extractedData = await redisClient.get(`extracted_document:${documentId}`);
        if (extractedData) {
          document = new Document({
            customId: documentId,
            userId,
            extractedText: JSON.parse(extractedData).extractedText,
            status: "pending", // Customize status
          });
          await document.save();
        } else {
          return res.status(404).json({ error: "Document data not found." });
        }
      }

      chat = new Chat({
        sessionId,
        userId,
        documentId: document ? document._id : null,
        messages: [{ role: "user", content: message }],
      });
      await chat.save();
    }

    let extractedText = "";
    if (documentId) {
      const document = await Document.findOne({ customId: documentId }, "extractedText");
      if (document?.extractedText) {
        extractedText = document.extractedText;
      } else {
        console.error("Document not found:", documentId);
        return res.status(404).json({ error: "Document not found." });
      }
    }

    // Extract only relevant text
    let relevantText = extractedText ? findRelevantText(message, extractedText) : "No relevant information found.";

    const aiPrompt = extractedText ? `Document Content: ${relevantText}\n\nUser Query: ${message}` : message;

    // Fetch AI Response
        let aiResponse;
        try {
          aiResponse = await callAIService(aiPrompt);
          console.log("AI Response:", aiResponse);
  } catch (aiError) {
          console.error("AI Service Error:", aiError.message);
          return res.status(500).json({ error: "Failed to get AI response." });
  }
  console.log("AI Response:", aiResponse);
    chat.messages.push({ role: "user", content: message });
    chat.messages.push({ role: "ai", content: aiResponse });
    await chat.save();
    res.json({ success: true, message: aiResponse, sessionId, chat });
  } catch (error) {
    console.error("Chatbot Error:", error.stack || error.message);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

/**
 * @route   POST /api/chat/archive
 * @desc    Archive chat session when user leaves
 * @access  Public
 */
router.post("/archive", chatController.archiveChat);



module.exports = router;

