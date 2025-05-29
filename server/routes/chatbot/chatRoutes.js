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
const { callAIService } = require("../../utils/callAIService");
const {authenticateJWT} = require("../../middleware/authenticationMiddleware/authMiddleware");

// at the top of chatRoutes.js
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = process.env;   // or wherever you store it

// custom light‐weight auth for chat routes
function chatAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // mirror your authenticateJWT payload shape
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role
    };
    return next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid token' });
  }
}


function detectLanguagePreference(message) {
  const lower = message.toLowerCase();
  if (lower.includes("in hindi") || lower.includes("translate in hindi") || lower.includes("hindi mein")) {
    return "hi";
  }
  return "en";
}


/**
 * @route   POST /api/chat/start-chatbot
 * @desc    Start a new chat session or continue an existing one,
 *          ensuring documentId is linked when provided.
 * @access  Public (No authentication required)
 */

//start a chat session
router.post('/start-chat', chatAuth, async (req, res) => {
  // Log as early as possible after auth
  console.log('👉 /start-chat handler entered');
  console.log('   req.user:', req.user);
  console.log('   req.body:', req.body);

  try {
    const userId = req.user.userId || req.user.id;
    let { sessionId: incomingSession, documentId, message, lang } = req.body;

    // Validate inputs
    if (!userId) {
      console.log('   ❌ Missing userId');
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      console.log('   ❌ Empty message');
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    message = message.trim();

    // Determine or generate sessionId
    const sessionId = incomingSession || uuidv4();
    console.log('   Using sessionId =', sessionId);

    // Attempt to pull and persist document (first question)
    let docRecord = null;
    if (documentId) {
      console.log('   Checking Redis for document:', documentId);
      const raw = await redisClient.get(`extracted_document:${documentId}`);
      console.log('   Redis returned:', raw ? 'data' : 'null');
      if (raw) {
        const { filename, extractedText, uploadedAt } = JSON.parse(raw);
        docRecord = await Document.findOneAndUpdate(
            { customId: documentId },
            { filename, extractedText, uploadedAt, owner: userId },
            { upsert: true, new: true }
        );
        console.log('   Document upserted to Mongo:', docRecord._id);
        await redisClient.del(`extracted_document:${documentId}`);
      }
    }

    // Fetch or create chat session
    let chat = await Chat.findOne({ sessionId, userId });
    console.log('   Found existing chat:', chat ? chat._id : 'none');
    if (!chat) {
      chat = new Chat({ sessionId, userId, documentId: docRecord?._id || null, messages: [] });
      console.log('   Created new chat record:', chat._id);
    }

    // Associate document on chat if needed
    if (docRecord && !chat.documentId) {
      chat.documentId = docRecord._id;
      console.log('   Linked document to chat session');
    }

    // Add user message
    chat.messages.push({ role: 'user', content: message });
    console.log('   Messages count before AI call:', chat.messages.length);

    // Build AI prompt
    const extractedText = docRecord?.extractedText || '';
    const hasDoc = extractedText.length > 30;
    let aiPrompt;
    if (hasDoc) {
      aiPrompt = `Document content:\n"${extractedText.slice(0, 1000)}"\n\nUser question:\n"${message}"\n\nAnswer in English.`;
    } else {
      aiPrompt = `You are an assistant that only answers questions about official Maharashtra government documents.\n` +
          `Guidelines:\n- Do not mention foreign countries or states outside Maharashtra.\n` +
          `- Always base answers on official Maharashtra schemes and services.\n` +
          `- If the question is unclear, ask for clarification.\n\nUser question: ${message}\nAnswer:`;
    }
    console.log('   AI prompt built');

    console.log('   Preparing LLM history…');
    const llmHistory = chat.messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content
    }));

    console.log('   Calling callAIService with sanitized history…');
    const aiResponse = await callAIService({
      userQuery: message,
      lang: lang || 'en',
      docContext: hasDoc ? extractedText : '',
      history: llmHistory
    });

    console.log('   Received AI response');

    const cleanAI = typeof aiResponse === 'string' ? aiResponse.trim() : '';
    if (cleanAI) {
      chat.messages.push({ role: 'ai', content: cleanAI });
      console.log('   Appended AI response');
    }

    await chat.save();
    console.log('   Chat saved with total messages:', chat.messages.length);
    return res.json({ success: true, message: cleanAI, sessionId, chat });

  } catch (error) {
    console.error('   ❌ /start-chat ERROR:', error.stack || error.message);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});


/**
 * @route   POST /api/chat/send
 * @desc    Send a message to the chatbot. If the chat is document-related,
 *          retrieve the extracted text from the document and attach it as context
 *          (if not already provided) before processing the user's message.
 * @access  Public
 */

router.post('/send', chatAuth, async (req, res) => {
  console.log("/send route of chatbot hit");
  try {
    let { message, sessionId, documentId, lang } = req.body;
    const userId = req.user.userId || req.user.id;

    if (!userId) return res.status(400).json({ error: 'Invalid user ID' });
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message cannot be empty.' });
    }
    message = message.trim();

    // Ensure session exists
    if (!sessionId) sessionId = uuidv4();
    let chat = await Chat.findOne({ userId, sessionId });

    if (!chat) {
      console.warn("⚠️ No chat found for sessionId, creating new.");
      chat = new Chat({ sessionId, userId, documentId: null, messages: [] });
    }


    // Persist document if needed
    let docRecord = null;

    if (documentId) {
      docRecord = await Document.findOne({ customId: documentId });
      if (!docRecord) {
        const extractedData = await redisClient.get(`extracted_document:${documentId}`);
        if (extractedData) {
          const { filename, extractedText, uploadedAt, fileSize, mimeType } = JSON.parse(extractedData);

          docRecord = new Document({
            customId: documentId,
            filename,
            extractedText,
            uploadedAt,
            userId,
            metadata: {
              fileSize: fileSize || 0,
              mimeType: mimeType || "application/pdf",
            },
          });
          await docRecord.save();

          await redisClient.del(`extracted_document:${documentId}`);
        }
      }

    }

    // Initialize chat record
    if (!chat) {
      chat = new Chat({ sessionId, userId, documentId: docRecord?._id || null, messages: [] });
    }
    chat.messages.push({ role: 'user', content: message });

    // Retrieve extracted text
    let extractedText = '';
    if (docRecord || documentId) {
      const doc = docRecord || await Document.findOne({ customId: documentId });
      extractedText = doc?.extractedText || '';
    }

    // Build AI prompt
    let aiPrompt;
    if (extractedText && extractedText.length > 30) {
      aiPrompt = `Document content:\n"${extractedText.slice(0, 1000)}"\n\nUser question:\n"${message}"\n\nAnswer in English.`;
    } else {
      aiPrompt = `You are an assistant that only answers questions about official Maharashtra government documents.
Guidelines:
- Do not mention foreign countries or states outside Maharashtra.
- Always base answers on official Maharashtra schemes and services.
- If the question is unclear, ask for clarification.

User question: ${message}

Answer:`;
    }

    console.log("🧠 /send: documentId =", documentId);
    console.log("🧠 /send: sessionId =", sessionId);
    console.log("🧠 /send: extractedText.length =", extractedText?.length);
    console.log("🧠 /send: chat.messages =", chat.messages.length);

    // Call AI service
    const aiResponse = await callAIService({ userQuery: message, lang: lang || 'en', docContext: extractedText, history: chat.messages });
    const cleanAI = typeof aiResponse === 'string' ? aiResponse.trim() : '';
    if (cleanAI) chat.messages.push({ role: 'ai', content: cleanAI });

    await chat.save();
    return res.json({ success: true, message: cleanAI, sessionId, chat });
  } catch (error) {
    console.error('Chatbot Error:', error.stack || error.message);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
});

/**
 * @route   POST /api/chat/archive
 * @desc    Archive chat session when user leaves
 * @access  Public
 */
router.post("/archive", chatController.archiveChat);

module.exports = router;

