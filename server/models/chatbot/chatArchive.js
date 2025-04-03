const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");

// Define Sub-schema for individual Chat Messages inside a chat session
const chatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ["user", "ai"], required: true }, //specifies who sent the message (user,asssistant)
  message: { type: String, required: true, trim: true, minlength:1, maxlength:5000 }, //stores the actual chat content, removes unnecessary spaces
  timestamp: { type: Date, default: Date.now }, //sstores when the message was sent
}); 

// Chat Archive Schema
const chatArchiveSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true, index: true }, 
    sessionId: {  type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true }, //unique identifier for the chat session
    chatHistory: {
      type: [chatMessageSchema],
      validate: [arrayLimit, "Chat history must be between 1 and 1000 messages."],
    },
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" }, //referencing to the Document model, for documentId
    status: { type: String, enum: ["active", "archived"], default: "active" }, //indicating whether the chat session is active or not
    archivedAt: { type: Date, default: null }, // stores when the chat was archieved. it remains null until the chat is archieved. improve search performance 
  },
  { timestamps: true } //automatically adds createdAt and updatedAt fields
);

function arrayLimit(val) {
  return Array.isArray(val) && val.length > 0 && val.length <= 1000;
}

// Add indexes
chatArchiveSchema.index({ user: 1, status: 1 }); //fetching data by user and status
chatArchiveSchema.index({ documentId: 1 }); //speeds up queries related to document-based chats
chatArchiveSchema.index({ user: 1, status: 1, archivedAt: -1 }); //retrieval of archived chats in descending order of archivedAt
chatArchiveSchema.index({ sessionId: 1 }, { unique: true }); // Ensures fast lookup of sessions
const CHAT_ARCHIVE_EXPIRY = process.env.CHAT_ARCHIVE_EXPIRY || 31536000;
chatArchiveSchema.index({ archivedAt: 1 }, { expireAfterSeconds: CHAT_ARCHIVE_EXPIRY });


// Virtual fields
//computes chat duration in milliseconds
chatArchiveSchema.virtual("duration").get(function () {
  if (this.chatHistory.length === 0) return 0;
  const start = this.chatHistory[0]?.timestamp || Date.now(); //first message timestamp
  const end = this.chatHistory[this.chatHistory.length - 1]?.timestamp || Date.now(); //last message timestamp
  return end - start;
});

chatArchiveSchema.virtual("durationMinutes").get(function () { //returns total message count in the chat
  return this.duration / 60000; // Convert milliseconds to minutes
});

// Pre-save hook
chatArchiveSchema.pre("save", function (next) {
  if (!this.chatHistory.length) return next(new Error("Chat history cannot be empty."));
  if (this.chatHistory.length > 1000) return next(new Error("Chat limit exceeded."));
  
  if (this.isModified("status") && this.status === "archived") {
    this.archivedAt = Date.now();
  }
  next();
});


// Instance method - Add message
chatArchiveSchema.methods.addMessage = async function (role, message) { //allows adding messages only if the chat is active
  if (this.status === "archived") { //prevents adding messages after the chat is archieved
    throw new Error("Cannot add messages to an archived chat session.");
  }
  if (this.chatHistory.length >= 1000) { //restricts message counts
    throw new Error("Cannot add more messages. Chat history limit of 1000 messages reached.");
  }
  const trimmedMessage = message.trim(); //preventing empty messages
  if (!trimmedMessage) {
    throw new Error("Cannot add empty or whitespace-only messages.");
  }
  // Prevent spamming the same message
  if (this.chatHistory.length > 0) {
    const lastMessage = this.chatHistory[this.chatHistory.length - 1];
    if (lastMessage.message === trimmedMessage && lastMessage.role === role) {
      throw new Error("Cannot send duplicate messages.");
    }
  }

  this.chatHistory.push({ role, message: trimmedMessage, timestamp: new Date() });
  return this.save();
};

// Static method - Archive session
chatArchiveSchema.statics.archiveUserChats = async function (userId) {
  const sessions = await this.find({ userId, status: "active" });
  if (!sessions.length) return;
  
  await this.updateMany({ userId, status: "active" }, { status: "archived", archivedAt: Date.now() });
  console.log(`All active chat sessions for user ${userId} archived.`);
};

// Static method - Get archived chats (only for authenticated users)
chatArchiveSchema.statics.getArchivedChats = async function (userId, page = 1, limit = 10) {
  if (!userId) throw new Error("User authentication required.");
  const skip = (page - 1) * limit;
  return this.find({ userId, status: "archived" })
    .sort({ archivedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("sessionId chatHistory archivedAt");
};


// Create Model
module.exports = mongoose.model("ChatArchive", chatArchiveSchema); //creates and exports the chatArchieve model