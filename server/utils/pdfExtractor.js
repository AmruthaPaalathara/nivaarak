const fs = require('fs'); // Add this line to import the fs module
const pdfParse = require("pdf-parse");

const extractTextFromPDF = async (filePath) => {
  try {
    const dataBuffer = await fs.promises.readFile(filePath);  // Asynchronous file reading
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error("Error extracting text:", error);
    return null;
  }
};

module.exports = { extractTextFromPDF };