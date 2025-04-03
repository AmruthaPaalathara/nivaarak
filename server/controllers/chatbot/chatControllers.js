/* handles chat messages, fetching document context, calling an AI model, archieiving chat history */

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
const User = require("../../models/authentication/userSchema.js");



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
    const cacheKey = `summary-${text.substring(0, 50)}...`;
    if (textCache.has(cacheKey)) {
      return textCache.get(cacheKey);
    }

    const summaryPrompt = `Summarize concisely in one paragraph:\n${text}`;
    console.log("Summarization prompt:", summaryPrompt);

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are a expert summarization assistant" },
          { role: "user", content: summaryPrompt }
        ],
        temperature: 0.3 // More deterministic output
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    const summary = response.data.choices?.[0]?.message?.content?.trim() || text;
    textCache.set(cacheKey, summary);
    return summary;
  } catch (error) {
    console.error("Summarization error:", error.message);
    return text; // Fallback to original text
  }
};



// Fetch Document Context
// validating documentId is a valid objectId
const fetchDocumentContext = async (documentId, userQuery) => {
  try {
    if (!documentId || !mongoose.Types.ObjectId.isValid(documentId)) { 
      throw new Error("Invalid document ID");
    }
    

    //Finds the document in MongoDB using Document.findById(). and extracts only the texts
    const doc = await Document.findById(documentId).select("extractedText userId customId");
    if (!doc) {
      throw new Error("Document not found");
    }

    console.log("Fetched document for context:", doc);
    let fullText = doc.extractedText || "";
    
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
    console.error("Error extracting text:", error.message);
    return "";
  }
};

// Call AI Model
const callAIModel = async (contextSnippet, userQuery) => {
  console.log("AI Model Input - Context:", contextSnippet);
  console.log("AI Model Input - User Query:", userQuery);

  const aiPrompt = `
   Document Context: ${contextSnippet || "No context available"}
  
  Question: "${userQuery}"
  
  Provide a concise or list of answer based solely on the above document context. Do not repeat the full context in your answer.Based on the document context above, provide a detailed answer that includes all relevant points. Do not omit any points or relevant thing from mentioned.

  Instructions:
- Extract and list **ALL** points related to the user query from the document.
- Do not summarize or omit any details.
- Provide the answer in a structured format.

Answer:
`.trim();

  console.log("Constructed AI prompt:", aiPrompt);

  try {

    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [
          { role: "system", content: "You are an intelligent assistant.Answer user queries based solely on the provided document context. Be concise.You are a precise government document analyst." },
          { role: "user", content: aiPrompt },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    console.log("AI API Response:", response.data);
    return response.data.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

  } catch (error) {
    console.error("AI Model Error:", error.message);
    throw error;
  }
};


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
    sessionId = sessionId ? String(sessionId) : new mongoose.Types.ObjectId().toString();
    console.log("Using sessionId:", sessionId);


    // If a document is linked, retrieve its extracted text
    let contextSnippet = documentId ? await fetchDocumentContext(documentId, message) : "No document attached. Answer generally about government documents.";
    const aiResponse = await callAIModel(contextSnippet, message);
    console.log("Saving chat messages:", { message, aiResponse });

    // Save to database
    let chat = await Chat.findOneAndUpdate(
      { sessionId },
      { $push: { messages: [{ role: "user", content: message }, { role: "ai", content: aiResponse }] },
        $setOnInsert: { documentId, createdAt: new Date() }
      },
      { upsert: true, new: true }
    );

    res.json({ success: true, message: aiResponse, sessionId, documentId });
  } catch (error) {
    console.error("Chat error:", error.message);
    res.status(500).json({ status: "error", message: error.message || "Failed to process message" });
  }
};


const sendMessage = async (message, sessionId, documentId, userId) => {
  // Use provided sessionId or generate a new one using UUID
  const session = sessionId ? String(sessionId) : uuidv4();
  console.log("Received request:", req.body);

  console.log(" Sending message:", message);
  console.log(" Session ID:", session);
  console.log(" Document ID:", documentId || "No document attached");
  
  if (!userId) {
    console.error("Unauthorized: User must be logged in");
    throw new Error("Unauthorized: User must be logged in");
  }

  try {
    let context = "";
    if (documentId) {
      // Fetch the document's extracted text from the API
      context = await fetchDocumentContext(documentId, message);
      console.log(" Extracted Document Context:", context.substring(0, 200)); // Log first 200 chars
    }
    // Build the payload – note that the backend may or may not use the context field
    const payload = {
      userId,
      message,
      sessionId: session,
      documentId: documentId || null,
      context, // This field is optional; your backend can decide how to use it
    };
    console.log("Payload being sent to AI:", payload);

    const response = await axios.post(
      "http://localhost:3001/api/chat/send",
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    console.log("Chat Response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error sending message:", error);
    throw error;
  }
};

const archiveChat = async (req, res) => {
  const { sessionId, messages, documentId } = req.body;

  const userId = req.user?.id; // Ensure user authentication is checked
    // Ensure user is logged in
    if (!userId || isNaN(userId)) {
      return res.status(401).json({ success: false, message: "Unauthorized: Invalid userId" });
    }

    const userExists = await User.findOne({ userId });
    if (!userExists) {
      return res.status(401).json({ success: false, message: "Unauthorized: User does not exist" });
    }
    
  // Input validation
  if (!sessionId || !messages || !Array.isArray(messages)) { //checks whether messages is an array or not
    return res.status(400).json({
      success: false,
      message: "sessionId and messages (array) are required",
    });
  }

  try {
    //  Check if chat session is already archived
    const existingArchive = await ChatArchive.findOne({ sessionId });
    if (existingArchive) {
      return res.status(400).json({
        success: false,
        message: "Chat session is already archived", //prevents duplicate archieves
      });
    }

    //  Filter out empty messages
    const cleanedMessages = messages
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
      linkedDocument = await Document.findOne( {customId: documentId });
      if (!linkedDocument) {
        return res.status(404).json({ error: "Document not found." });
      }
    }

    // Archive previous active chats of the user
    await ChatArchive.updateMany(
      { user: userId, status: "active" },
      { status: "archived", archivedAt: new Date() }
    );
    

    //  Create new chat archive
    const archive = new ChatArchive({
      user: userId, //  Associate with user
      sessionId,
      chatHistory: cleanedMessages, //  Ensure correct field name
      documentId: linkedDocument ? linkedDocument._id : null,
      status: "archived",
      archivedAt: new Date(),
    });
    chat.status = "archived";
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


module.exports = { handleChatMessage, fetchDocumentContext, callAIModel, sendMessage, archiveChat };