const mongoose = require("mongoose");

const generatePdfSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref:"User" }, //  Custom userId instead of ObjectId
  name: { type: String, required: true },
  documentType: { type: String, required: true , ref:"UserDocument" },
  status: { type: String, required: true, enum: ["pending", "generated", "failed"] },// Limits values
  pdfContent: { type: String },
}, { timestamps: true });

module.exports = mongoose.model("GeneratedPDF", generatePdfSchema);