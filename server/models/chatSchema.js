const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    sender: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Chat", chatSchema);
