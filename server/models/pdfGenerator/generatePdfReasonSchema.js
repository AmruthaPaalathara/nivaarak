const mongoose = require("mongoose");

const generatePdfReasonSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: "User" },
  name: { type: String, required: true },
  documentType: { type: String, required: true, ref: "UserDocument" },
  documentTypeKey:{ type: String, required: true, index: true },
  benefits: { type: [String], required: true },
  eligibility: { type: [String], required: true },
  rejectionReason: { type: [String], required: true },
  resubmission:  { type: mongoose.Schema.Types.Mixed, default: {} },
  status: { type: String, required: true, enum:  ['pending','generated','failed','rejected'],  default: "pending", },
}, { timestamps: true });

// Normalize documentType
generatePdfReasonSchema.pre("save", function (next) {
  if (this.documentType) {
    this.documentType = this.documentType.trim().toLowerCase();
  }
  next();
});


module.exports = mongoose.model("PdfReason", generatePdfReasonSchema);
