// Importing mongoose for MongoDB interaction
const mongoose = require("mongoose");
const { Counter } = require("../authentication/userSchema.js"); 


//creating a new mongoose schema for storing chat sessions
const chatMessageSchema  = new mongoose.Schema(

//defining schema fields for the chatschema
  
      {
        role: { type: String, enum: ["user", "ai"], required: true }, //stores the user and ai responses
        content: {
          type: String, //stores the chat as string
          required: true, //mentioning it as a mandatory field
          trim: true, //reduces extra space
          validate: {
            validator: (value) => value.trim().length > 0, //validating by checking the length of the chat
            message: "Message content cannot be empty or whitespace.",
          },
        },
        timestamp: { type: Date, default: Date.now }, //storing the time of the chat
      });

// Define the Chat Schema
const chatSchema = new mongoose.Schema(
  {
    userId: { type: Number, required: true }, //stores userId by refering to 
    documentId: { type: mongoose.Schema.Types.ObjectId, ref: "Document" }, //stores or extracts documentId from Document model (documentSchema.js)
    
    sessionId: { type: String, required: true, unique:true }, //to identify a chat session, to ensure each chat belongs to a valid session
    status: { type: String, enum: ["active", "closed", "archived"], default: "active" }, //status of the chat, whether it is active or closed. by default the chat is active(i.e., when a new chat happens, the chat sessions begins as active)
    messages: [chatMessageSchema],
  },
  { timestamps: true }
);



// Add indexes
// chatSchema.index({ sessionId: 1 }); //retrieving the sessionId
chatSchema.index({ userId: 1, status: 1 });
chatSchema.index({ documentId: 1 }); //retrieving the documentId
chatSchema.index({ updatedAt: -1 }); //retrieving the recent chat. it is ordered in descneding order

// Pre-save hook that runs before a document is saved
chatSchema.pre("save", async function (next) { 
  try {
  if (this.isNew) {
    if (!this.messages.length) {
      return next(new Error("Chat session must have at least one message."));
    }
    
    if (!this.userId) {
      const counter = await Counter.findOneAndUpdate(
        { _id: "userId" },  // Ensure correct query object
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }  // Ensures it creates if not exists
      );
    
      this.userId = counter.sequence_value;  // Assign new sequence value
    }
  }

  if (this.status === "closed" && this.isModified("messages")) {
      return next(new Error("Cannot modify messages in a closed chat session."));
    }

    if (this.messages.length > 1000) {
      return next(new Error("Chat history exceeds the maximum allowed messages (1000)."));
    }

    next(); // Continue if no validation errors
  } catch (error) {
    next(error);
  }
});


// Virtual field for message count in a chat
chatSchema.virtual("messageCount").get(function () {
  return this.messages.length;
});


// Instance method - Add message (adding new messages to the chat session)
chatSchema.methods.addMessage = async function (role, content) {
  if (this.status === "closed") {
    throw new Error("Cannot add messages to a closed chat session.");
  }
  if (this.messages.length >= 1000) { //prevents chats having more than 1000 messages
    throw new Error("Cannot add more messages. Chat history limit of 1000 messages reached.");
  }
  const trimmedMessage = content.trim(); //ensuring white spaces or empty messages are not allowed
  if (!trimmedMessage) {
    throw new Error("Cannot add empty or whitespace-only messages.");
  }
  this.messages.push({ role, content: trimmedMessage, timestamp: new Date() }); //adds the message to the chat and saves the updated document
  return this.save();
};

// Instance method - Close chat session
chatSchema.methods.closeSession = function ()  { //marks the chat as closed
  if (this.status === "closed") { //If the chat is already closed, return without making changes
    return Promise.resolve(this);
  }
  this.status = "closed"; //updates the status to closed and return the saves the document
  return this.save();
};

chatSchema.methods.archiveSession = function () {
  if (this.status === "archived") {
    return Promise.resolve(this);
  }
  this.status = "archived";
  return this.save();
};

// Static method - Get closed chat sessions
chatSchema.statics.findClosedSessions = function (userId = null, page = 1, limit = 10)   { //
  const skip = (page - 1) * limit;
  const query = {status:"closed"};

  if (userId) {
    query.userId = userId; // Only filter by userId if it exists
  }

  return this.find(query)
    .sort({ updatedAt: -1 })
    .skip(skip)
    .limit(limit)
    .select("sessionId messages updatedAt");
};

module.exports = mongoose.model("Chat", chatSchema);