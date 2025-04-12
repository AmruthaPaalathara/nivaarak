const mongoose = require("mongoose");
const { User } = require("../authentication/userSchema")

const userDocumentSchema = new mongoose.Schema({
  userId: { type: Number, ref: "User", required: true },
  documentType: { type: String, required: true },
  files: { type: [String], required: true },
  submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserDocument", userDocumentSchema);
