// models/chatArchiveSchema.js
const mongoose = require("mongoose");

const chatArchiveSchema = new mongoose.Schema({
  chatHistory: { type: Array, required: true },
  documentId: { type: String },
  archivedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("ChatArchive", chatArchiveSchema);