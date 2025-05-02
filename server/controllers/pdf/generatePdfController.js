const PDFDocument = require("pdfkit");
const { Readable } = require("stream");
const GeneratedPDF = require("../../models/pdfGenerator/generatePdfSchema");
const PdfReason = require("../../models/pdfGenerator/generatePdfReasonSchema");

const generatePDF = async (req, res) => {
  console.log(" Received request to generate PDF...");
  console.time("PDF_GENERATION_PROCESS");

  const { userId, documentType } = req.body;
  const llamaData = req.llamaData; //  Ensure AI data is correctly passed from middleware

  console.log(" Request Body:", req.body);
  console.log(" AI Data (llamaData):", llamaData);

  if (!userId || !documentType || !llamaData ) {
    console.error(" Missing required fields or AI data.");
    return res.status(400).json({ error: "Missing required fields or AI data" });
  }

  try {
    console.log("🛠 Starting PDF generation for:", documentType);

    // 1. Create a PDF in memory
    const doc = new PDFDocument();

    const buffers = [];
    doc.on("data", (chunk) => buffers.push(chunk));
    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      console.timeEnd("PDF_GENERATION_PROCESS");

      const fileName = `${documentType.replace(/\s+/g, "_")}-details.pdf`;

      console.log(" Successfully generated PDF for userId:", userId, "and documentType:", documentType.trim().toLowerCase());

      //  Format Resubmission Information properly before saving
      const formattedResubmission = llamaData.resubmissionInformation
          ? `Required Documents:\n${llamaData.resubmissionInformation["Required Documents"]
              .map((docItem) => `- ${docItem}`)
              .join("\n")}\n\nTimelines:\nResubmission period: ${llamaData.resubmissionInformation.Timelines["Resubmission period"].join(", ")}\nReapplication fee: ${llamaData.resubmissionInformation.Timelines["Reapplication fee"].join(", ")}`
          : "N/A";

      console.time("MONGODB_SAVE");

      //  Prevent duplicate saves & save in parallel
      const pdfRecord = new GeneratedPDF({
        userId,
        name: fileName,
        documentType: documentType.trim().toLowerCase(),
        status: "generated",
        pdfContent: pdfBuffer.toString("base64"),
      });

      const pdfReasonRecord = new PdfReason({
        userId,
        name: fileName,
        documentType: documentType.trim().toLowerCase(),
        benefits: llamaData.benefits || "Not available",
        eligibility: llamaData.eligibility || "Not available",
        rejectionReason: llamaData.rejectionReasons || "Not available",
        resubmission: formattedResubmission,
        status: "generated",
      });

      await Promise.all([pdfRecord.save(), pdfReasonRecord.save()]);

      console.log(" PDF metadata and reason saved successfully.");
      console.timeEnd("MONGODB_SAVE");

      //  Respond only after successful saving
      res.status(200).json({ success: true, message: "PDF generated and saved successfully." });
    });

    // 2. Generate PDF content
    doc.fontSize(20).text(`${documentType}`, { align: "center" }).moveDown();
    doc.fontSize(12).text("Introduction:", { underline: true }).text(llamaData.introduction || "N/A").moveDown();
    doc.text("Benefits:", { underline: true }).text(llamaData.benefits || "N/A").moveDown();
    doc.text("Eligibility:", { underline: true }).text(llamaData.eligibility || "N/A").moveDown();
    doc.text("Rejection Reasons:", { underline: true }).text(llamaData.rejectionReasons || "N/A").moveDown();
    doc.text("Resubmission Information:", { underline: true }).moveDown();

    if (llamaData.resubmissionInformation) {
      if (Array.isArray(llamaData.resubmissionInformation["Required Documents"])) {
        doc.text("Required Documents:", { bold: true }).moveDown();
        llamaData.resubmissionInformation["Required Documents"].forEach((docItem) => {
          doc.text(`• ${docItem}`, { indent: 20 }).moveDown(); //  Proper bullet points
        });
      }

      if (llamaData.resubmissionInformation.Timelines) {
        doc.text("Timelines:", { bold: true }).moveDown();
        doc.text(`Resubmission period: ${llamaData.resubmissionInformation.Timelines["Resubmission period"].join(", ")}`, {
          indent: 20,
        }).moveDown();
        doc.text(`Reapplication fee: ${llamaData.resubmissionInformation.Timelines["Reapplication fee"].join(", ")}`, {
          indent: 20,
        }).moveDown();
      }
    } else {
      doc.text("N/A").moveDown();
    }

    doc.text("Official Documents:", { underline: true }).text(llamaData.officialDocs?.join(", ") || "N/A").moveDown();
    doc.end(); //  Must call this to properly finish

  } catch (error) {
    console.error(" Unexpected error in PDF generation:", error);
    res.status(500).json({ error: "Internal Server Error while generating PDF" });
  }
};

module.exports = { generatePDF };