const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generatePDF = async (req, res) => {  
  try {
    // 🔹 Ensure LLaMA data is properly formatted
    let benefits, eligibility;
    try {
      ({ benefits, eligibility } = JSON.parse(req.llamaData));
    } catch (error) {
      return res.status(400).json({ error: "Invalid LLaMA data format" });
    }

    const documentType = "General Certificate";  
    const rejectionReason = "Incomplete documentation";
    const resubmission = "Please submit additional documents within 10 days.";

    // 🔹 Ensure `./pdfs/` directory exists
    const pdfDir = path.join(__dirname, "../../pdfs");
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }

    // 🔹 Set PDF file path
    const fileName = `${documentType.replace(/\s+/g, "_")}-details.pdf`;
    const filePath = path.join(pdfDir, fileName);

    // 🔹 Create & Write PDF
    const doc = new PDFDocument();
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.fontSize(20).text(`${documentType}`, { align: "center" }).moveDown();
    doc.fontSize(14).text(`Eligibility:\n${eligibility}`).moveDown();
    doc.text(`Benefits:\n${benefits}`).moveDown();
    doc.text(`Reasons for Decline:\n${rejectionReason}`).moveDown();
    doc.text(`Resubmission Process:\n${resubmission}`);
    doc.end();

    // 🔹 Wait for PDF to be written before sending response
    writeStream.on("finish", () => {
      res.download(filePath, fileName, (err) => {
        if (!err) {
          fs.unlinkSync(filePath); //  Delete file after download
        } else {
          console.error("Error sending file:", err);
        }
      });
    });
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Error generating PDF" });
  }
};

//  Ensure `generatePDF` is properly exported
module.exports = { generatePDF };
