const mongoose = require("mongoose");

const generatePdfReasonSchema = new mongoose.Schema({
  documentType: String,
  benefits: String,
  eligibility: String,
  rejectionReason: String,
  resubmission: String,
});

module.exports = mongoose.model("PdfReason", generatePdfReasonSchema);
