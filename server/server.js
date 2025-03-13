const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { processPdf } = require("./extractDetails");
const Document = require("./models/documentSchema");
const ollama = require("ollama").default;


import axios from 'axios';

const app = express();
app.use(cors());
app.use(express.json());

//  Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/chatbotDB", {
    serverSelectionTimeoutMS: 5000, // Avoid connection delays
}).then(() => console.log(" MongoDB connected"))
.catch(err => console.error(" MongoDB connection error:", err));

//  Configure Multer for File Uploads
const upload = multer({ dest: path.join(__dirname, "uploads/") });

//  Route: Upload & Extract Details from PDF
app.post("/extract-details", upload.single("pdf"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    console.log(" File received:", req.file.path);

    //  Process the PDF using the function from extractDetails.js
    const result = await processPdf(req.file.path);
    if (!result) {
        return res.status(500).json({ error: "Failed to process PDF" });
    }

    res.json({
        message: " Extraction successful!",
        documentId: result._id,
        extractedDetails: result.extractedDetails
    });
});

//  Route: Fetch Extracted Data from MongoDB
app.get("/get-document/:id", async (req, res) => {
    try {
        const document = await Document.findById(req.params.id);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }
        res.json(document);
    } catch (error) {
        console.error(" Error fetching document:", error);
        res.status(500).json({ error: "Failed to fetch document" });
    }
});

//  Route: Ask Chatbot About Extracted Document
app.post("/ask-document", async (req, res) => {
    const { question, documentId } = req.body;

    if (!question) {
        return res.status(400).json({ error: "No question provided" });
    }
    if (!documentId) {
        return res.status(400).json({ error: "No documentId provided" });
    }

    console.log(" Received documentId:", documentId);

    try {
        const document = await Document.findById(documentId);
        if (!document) {
            console.error(" No document found for ID:", documentId);
            return res.status(404).json({ error: "Document not found" });
        }

        console.log(" Extracted Text for Chat:", document.extractedText.substring(0, 500));

        //  Ensure LLaMA 3 gets a limited prompt to avoid overload
        const prompt = `
        Based on this document, answer the question: "${question}".
        Document content (shortened): ${document.extractedText.substring(0, 1000)}

        Answer only based on the document.
        `;

        const response = await ollama.chat({
            model: "llama3:latest",  //  Ensure correct model
            messages: [{ role: "user", content: prompt }]
        });

        console.log(" LLaMA 3 Response:", response.message.content);
        res.json({ response: response.message.content });

    } catch (error) {
        console.error(" Error processing document question:", error);
        res.status(500).json({ error: "Error processing document question." });
    }
});

//  Start the Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(` Server running at http://localhost:${PORT}`);
});


//application registeration form

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

export const submitDocumentVerification = async (formData) => {
  try {
    // Create a FormData object to send files
    const data = new FormData();
    
    // Append all form fields
    data.append('username', formData.username);
    data.append('firstName', formData.firstName);
    data.append('lastName', formData.lastName);
    data.append('email', formData.email);
    data.append('phone', formData.phone);
    data.append('documentType', formData.documentType);
    data.append('state', formData.state);
    
    // Append files
    if (formData.documentFile) {
      data.append('documentFile', formData.documentFile);
    }
    
    if (formData.idProof) {
      data.append('idProof', formData.idProof);
    }
    
    // Send the request
    const response = await api.post('/documents/verify', data);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : new Error('Network error occurred');
  }
};

export default api;
