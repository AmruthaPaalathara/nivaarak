const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    sender: { type: String, required: true },  // Sender's name or ID
    text: { type: String, default: null },     // Text message (optional)
    document: {                                // Store uploaded document info
        fileName: { type: String, default: null },
        fileUrl: { type: String, default: null },  // URL/path where the file is stored
        fileType: { type: String, default: null }  // Example: 'pdf', 'image/png'
    },
    timestamp: { type: Date, default: Date.now } // Timestamp of the message
});

module.exports = mongoose.model("Chat", chatSchema);
