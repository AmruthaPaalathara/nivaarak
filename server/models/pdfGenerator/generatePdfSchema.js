const mongoose = require("mongoose");

const generatePdfSchema = new mongoose.Schema({
  name: String,
  documentType: String,
  status: String,
});

module.exports = mongoose.model("GeneratedPDF", generatePdfSchema);
