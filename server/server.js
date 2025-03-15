const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processPdf } = require("./extractDetails");
const Document = require("./models/documentSchema");
const ChatArchive = require("./models/chatArchiveSchema"); // Import the ChatArchive model
const ollama = require("ollama").default;

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/chatbotDB", {
    serverSelectionTimeoutMS: 5000, // Avoid connection delays
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Configure Multer for File Uploads
const upload = multer({ dest: path.join(__dirname, "uploads/") });

// Route: Upload & Extract Details from PDF
app.post("/extract-details", upload.single("pdf"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  console.log("File received:", req.file.path);

  // Process the PDF using the function from extractDetails.js
  const result = await processPdf(req.file.path);
  if (!result) {
    return res.status(500).json({ error: "Failed to process PDF" });
  }

  res.json({
    message: "Extraction successful!",
    documentId: result._id,
    extractedDetails: result.extractedDetails,
  });
});

// Route: Fetch Extracted Data from MongoDB
app.get("/get-document/:id", async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).json({ error: "Failed to fetch document" });
  }
});

// Route: Ask Chatbot About Extracted Document
app.post("/ask-document", async (req, res) => {
  const { question, documentId } = req.body;

  if (!question) {
    return res.status(400).json({ error: "No question provided" });
  }

  try {
    let prompt = question;
    if (documentId) {
      const document = await Document.findById(documentId);
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }
      prompt = `Based on this document, answer the question: "${question}". Document content: ${document.extractedText}`;
    }

    const response = await ollama.chat({
      model: "llama3:latest",
      messages: [{ role: "user", content: prompt }],
    });

    res.json({ response: response.message.content });
  } catch (error) {
    console.error("Error processing document question:", error);
    res.status(500).json({ error: "Error processing document question." });
  }
});

// Route: Archive Chat
app.post("/archive-chat", async (req, res) => {
  const { chatHistory, documentId } = req.body;

  if (!chatHistory || chatHistory.length === 0) {
    return res.status(400).json({ error: "No chat history provided" });
  }

  try {
    // Save the chat history and document ID to the database
    const newArchive = new ChatArchive({
      chatHistory,
      documentId,
      archivedAt: new Date(),
    });
    await newArchive.save();

    res.json({ message: "Chat archived successfully!" });
  } catch (error) {
    console.error("Archive error:", error);
    res.status(500).json({ error: "Failed to archive chat" });
  }
});

// Use Applicant Routes
const applicantRoutes = require("./routes/ApplicantRoutes");
app.use("/api", applicantRoutes);

// Start the Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});