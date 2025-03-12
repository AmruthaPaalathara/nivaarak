const fs = require("fs");
const pdfParse = require("pdf-parse");
const Tesseract = require("tesseract.js");

const filePath = "/home/lab/Amrutha_Internship/AMRUTHA_PAALATHARA_SSLC_BOOK.pdf"; // Change filename if needed


Tesseract.recognize(
    filePath,
    "eng", 
    { logger: (m) => console.log(m) }
).then(({ data: { text } }) => {
    console.log("Extracted OCR Text:", text);
}).catch(error => {
    console.error(" OCR Error:", error);
});

