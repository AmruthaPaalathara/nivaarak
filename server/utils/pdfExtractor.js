const fs = require("fs");
const pdfParse = require("pdf-parse");
const { extractTextWithOCR } = require("./ocrFallbackExtractor");

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    if (data.text?.trim()) {
      return data.text.trim();
    } else {
      console.warn(`⚠️ No text found using pdf-parse for ${filePath}. Falling back to OCR...`);
      const ocrResult = await extractTextWithOCR(filePath);
      return ocrResult.text || "";
    }
  } catch (error) {
    console.error(`❌ PDF-Parse failed for ${filePath}:`, error.message);
    console.log("⏪ Trying OCR fallback...");
    try {
      const ocrResult = await extractTextWithOCR(filePath);
      return ocrResult.text || "";
    } catch (ocrError) {
      console.error("❌ OCR Fallback failed:", ocrError.message);
      return "";
    }
  }
};

module.exports = { extractTextFromPDF };
