const Certificate = require("../../models/application/certificateApplicationSchema");
const PDFDocument = require("pdfkit");
const mongoose = require("mongoose");
const GeneratedPDF = require("../../models/pdfGenerator/generatePdfSchema");
const PdfReason = require("../../models/pdfGenerator/generatePdfReasonSchema");
const Citizen = require("../../models/citizenDetails/citizenSchema");
const DocumentRule = require("../../models/verification/DocumentRule");

// Controller to generate and save a PDF certificate using structured PDF data in req.pdfContent
async function generatePDF(req, res, next) {
  console.log("\ud83d\udcc4 generatePDF called");

  const { userId, documentType, rejectionReasons: specificReasons = [] } = req.body;
  const pdfData = req.pdfContent || {};

  if (!userId || !documentType) {
    return res.status(400).json({ error: "Missing userId or documentType" });
  }

  try {
    const citizen = await Citizen.findOne({ userId });

    const app = await Certificate.findOne({ userId, documentType });

// Convert extractedDetails Map to object
    const detailsObj = Object.fromEntries(app?.extractedDetails || []);
    const aiReason = detailsObj.rejectionReason || "No rejection reason provided.";

    const rule = await DocumentRule.findOne({ docType: documentType });
    const docsList = rule?.requiredDocs?.get("required_documents") || [];

    const cleanType = documentType.trim();
    const keyType = cleanType.toLowerCase();

    const session = await mongoose.startSession();
    session.startTransaction();

    const doc = new PDFDocument();
    doc.on("error", async (err) => {
      console.error("PDFKit error:", err);
      try {
        await session.abortTransaction();
      } catch (abortErr) {
        console.error("Failed to abort transaction:", abortErr);
      } finally {
        session.endSession();
      }
      res.status(500).json({ success: false, message: "PDF generation failed." });
    });

    const buffers = [];
    doc.on("data", chunk => buffers.push(chunk));
    doc.on("end", async () => {
      try {
        const pdfBuffer = Buffer.concat(buffers);

        await GeneratedPDF.create([{
          userId,
          name: `${cleanType.replace(/\s+/g, "_")}.pdf`,
          documentType: cleanType,
          documentTypeKey: keyType,
          status: specificReasons.length ? "rejected" : "generated",
          pdfContent: pdfBuffer.toString("base64"),
        }]);

        await PdfReason.create([{
          userId,
          name: `${cleanType.replace(/\s+/g, "_")}-reason.pdf`,
          documentType: cleanType,
          documentTypeKey: keyType,
          benefits: pdfData.benefits || "Not available",
          eligibility: pdfData.eligibility || "Not available",
          rejectionReason: specificReasons.length
              ? specificReasons.join("\n")
              : pdfData.rejectionReasons || "None",
          resubmission: JSON.stringify(pdfData.resubmissionInformation || {}),
          officialDocs: (pdfData.officialDocs || []).join("\n"),
          status: specificReasons.length ? "rejected" : "generated",
        }]);

        return res.json({ success: true, message: "PDF generated." });
      } catch (err) {
        console.error("Error saving PDF data:", err);
        res.status(500).json({ success: false, message: "Failed to save PDF." });
      }
    });

    // Start writing PDF content
    doc.fontSize(20).text(cleanType, { align: "center" }).moveDown();

    console.log("\ud83d\udcdc Final PDF Content:", JSON.stringify(pdfData, null, 2));

    ["introduction", "benefits", "eligibility"].forEach(key => {
      doc.fontSize(12)
          .text(`${key.charAt(0).toUpperCase() + key.slice(1)}:`, { underline: true })
          .text(pdfData[key] || "N/A")
          .moveDown();
    });

    // Combine specificReasons + AI-generated rejectionReason
    const rejectionList = [];

    if (specificReasons?.length) {
      rejectionList.push(...specificReasons);
    }

    if (aiReason && aiReason !== "No rejection reason provided.") {
      rejectionList.push(...aiReason.split("\n").map(r => r.trim()).filter(Boolean));
    }

    if (rejectionList.length > 0) {
      doc.text("Reason for Rejection:", { underline: true }).moveDown();
      rejectionList.forEach(r => doc.text(`• ${r}`).moveDown());
    }


    doc.text("Resubmission Information:", { underline: true }).moveDown();
    Object.entries(pdfData.resubmissionInformation || {}).forEach(([section, items]) => {
      doc.text(`${section}:`).moveDown();
      if (Array.isArray(items)) {
        items.forEach(item => doc.text(`  • ${item}`).moveDown());
      } else if (typeof items === "object") {
        Object.entries(items).forEach(([sub, vals]) => {
          doc.text(`  ${sub}:`).moveDown();
          const values = Array.isArray(vals) ? vals : [vals];
          values.forEach(val => doc.text(`    - ${val}`).moveDown());
        });
      }
    });

    doc.text("Official Documents:", { underline: true }).moveDown();
    (pdfData.officialDocs || []).forEach(d => doc.text(`• ${d}`).moveDown());

    doc.end();
  } catch (err) {
    console.error("Unexpected error in generatePDF:", err);
    return next(err);
  }
}

module.exports = { generatePDF };
