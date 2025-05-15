// const PDFDocument = require("pdfkit");
// const { Readable } = require("stream");
// const GeneratedPDF = require("../../models/pdfGenerator/generatePdfSchema");
// const PdfReason = require("../../models/pdfGenerator/generatePdfReasonSchema");
// const Citizen      = require("../../models/citizenDetails/citizenSchema");
// const DocumentRule = require("../../models/verification/DocumentRule");
//
// // Middleware `fetchLlamaData` must run before this to populate `req.llamaData`.
// async function generatePDF(req, res) {
//   console.log("📄 generatePDF called");
//   const { userId, documentType, rejectionReasons } = req.body;
//   const llamaData = req.llamaData || {};
//
//   if (!userId ) {
//     return res.status(400).json({ error: "Missing userId" });
//   }
//
//   if ( !documentType ) {
//     return res.status(400).json({ error: "Missing documentType " });
//   }
//
//   // 1) look up any Citizen info you might need in the PDF:
//   const citizen = await Citizen.findOne({ userId });
//   // 2) fetch the DocumentRule so you can build “resubmissionInformation”
//   const rule = await DocumentRule.findOne({ docType: documentType });
//   // 3) derive your resubmissionInformation from the rule
//   const docsList = rule?.requiredDocs?.get('required_documents') || [];
//
//
//   console.log(" Request Body:", req.body);
//   console.log(" AI Data (llamaData):", llamaData);
//
//   if (!llamaData ) {
//     console.error(" Missing AI data.");
//     return res.status(400).json({ error: "Missing  AI data" });
//   }
//
//   try {
//     console.log("🛠 Starting PDF generation for:", documentType);
//
//     // 1. Create a PDF in memory
//     const doc = new PDFDocument();
//
//     const buffers = [];
//     doc.on("data", (chunk) => buffers.push(chunk));
//     doc.on("end", async () => {
//       const pdfBuffer = Buffer.concat(buffers);
//       console.timeEnd("PDF_GENERATION_PROCESS");
//
//       const fileName = `${documentType.replace(/\s+/g, "_")}-details.pdf`;
//
//       console.log(" Successfully generated PDF for userId:", userId, "and documentType:", documentType.trim().toLowerCase());
//
//
//       // 1) Safely extract your resubmission info
//       const resub = llamaData.resubmissionInformation || {};
//
//       // 2) Normalize the list key (adjust to whatever your AI actually sends)
//       //    it might be resub.required_documents or resub["Required Documents"]
//       const docsList =
//           Array.isArray(resub.required_documents)
//               ? resub.required_documents
//               : Array.isArray(resub["Required Documents"])
//                   ? resub["Required Documents"]
//                   : [];
//
//
//       // 3) Normalize the timelines object
//       const timelines = resub.Timelines || {};
//
//       // 4) Build lines for Required Documents
//       const docsText = docsList.length
//           ? docsList.map((d) => `• ${d}`).join("\n")
//           : "N/A";
//
//       // 5) Build lines for timelines
//       const period = Array.isArray(timelines["Resubmission period"])
//           ? timelines["Resubmission period"].join(", ")
//           : "N/A";
//       const fee = Array.isArray(timelines["Reapplication fee"])
//           ? timelines["Reapplication fee"].join(", ")
//           : "N/A";
//
//       //  Format Resubmission Information properly before saving
//       const formattedResubmission = [
//         "Required Documents:",
//         docsText,
//         "",
//         "Timelines:",
//         `Resubmission period: ${period}`,
//         `Reapplication fee: ${fee}`,
//       ].join("\n");
//
//       console.time("MONGODB_SAVE");
//
//       //  Prevent duplicate saves & save in parallel
//       const pdfRecord = new GeneratedPDF({
//         userId,
//         name: fileName,
//         documentType: documentType.trim().toLowerCase(),
//         status: "generated",
//         pdfContent: pdfBuffer.toString("base64"),
//       });
//
//       const pdfReasonRecord = new PdfReason({
//         userId,
//         name: fileName,
//         documentType: documentType.trim().toLowerCase(),
//         benefits: llamaData.benefits || "Not available",
//         eligibility: llamaData.eligibility || "Not available",
//         rejectionReason: llamaData.rejectionReasons || "Not available",
//         resubmission: formattedResubmission,
//         status: "generated",
//       });
//
//       await Promise.all([pdfRecord.save(), pdfReasonRecord.save()]);
//
//       console.log(" PDF metadata and reason saved successfully.");
//       console.timeEnd("MONGODB_SAVE");
//
//       //  Respond only after successful saving
//       res.status(200).json({ success: true, message: "PDF generated and saved successfully." });
//     });
//
//     // 2. Generate PDF content
//     doc.fontSize(20).text(`${documentType}`, { align: "center" }).moveDown();
//     doc.fontSize(12).text("Introduction:", { underline: true }).text(llamaData.introduction || "N/A").moveDown();
//     doc.text("Benefits:", { underline: true }).text(llamaData.benefits || "N/A").moveDown();
//     doc.text("Eligibility:", { underline: true }).text(llamaData.eligibility || "N/A").moveDown();
//     doc.text("Rejection Reasons:", { underline: true }).text(rejectionReasons.length > 0
//         ? rejectionReasons.join("\n")
//         : "N/A").moveDown();
//     doc.text("Resubmission Information:", { underline: true }).moveDown();
//
//     if (llamaData.resubmissionInformation) {
//       if (Array.isArray(llamaData.resubmissionInformation["Required Documents"])) {
//         doc.text("Required Documents:", { bold: true }).moveDown();
//         llamaData.resubmissionInformation["Required Documents"].forEach((docItem) => {
//           doc.text(`• ${docItem}`, { indent: 20 }).moveDown(); //  Proper bullet points
//         });
//       }
//
//       if (llamaData.resubmissionInformation.Timelines) {
//         doc.text("Timelines:", { bold: true }).moveDown();
//         doc.text(`Resubmission period: ${llamaData.resubmissionInformation.Timelines["Resubmission period"].join(", ")}`, {
//           indent: 20,
//         }).moveDown();
//         doc.text(`Reapplication fee: ${llamaData.resubmissionInformation.Timelines["Reapplication fee"].join(", ")}`, {
//           indent: 20,
//         }).moveDown();
//       }
//     } else {
//       doc.text("N/A").moveDown();
//     }
//
//     doc.text("Official Documents:", { underline: true }).text(llamaData.officialDocs?.join(", ") || "N/A").moveDown();
//     doc.end(); //  Must call this to properly finish
//
//   } catch (error) {
//     console.error(" Unexpected error in PDF generation:", error);
//     res.status(500).json({ error: "Internal Server Error while generating PDF" });
//   }
// };
//
// exports.generateRejectionPDF = async (req, res) => {
//   const { userId, documentType, rejectionReasons } = req.body;
//
//   if (!userId)           return res.status(400).json({ error: 'Missing userId' });
//   if (!documentType)     return res.status(400).json({ error: 'Missing documentType' });
//   if (!Array.isArray(rejectionReasons))
//     return res.status(400).json({ error: 'Missing rejectionReasons' });
//
//   // (optional) look up any citizen data you want to stamp on the PDF
//   const citizen = await Citizen.findOne({ userId });
//   if (!citizen) return res.status(404).json({ error: 'Citizen not found' });
//
//   // (optional) rule to build “next steps” or timelines
//   const rule = await DocumentRule.findOne({ docType: documentType });
//   const docsList = rule?.requiredDocs?.get('required_documents') || [];
//
//   // build your PDF
//   const doc = new PDFDocument();
//   const buffers = [];
//   doc.on('data', chunk => buffers.push(chunk));
//   doc.on('end', async () => {
//     const pdfBuffer = Buffer.concat(buffers);
//     // save to Mongo
//     const fileName = `${documentType.replace(/\s+/g, '_')}-rejection.pdf`;
//     await GeneratedPDF.create({
//       userId,
//       name: fileName,
//       documentType,
//       status: 'rejected',
//       pdfContent: pdfBuffer.toString('base64'),
//     });
//     await PdfReason.create({
//       userId,
//       name: fileName,
//       documentType,
//       rejectionReason: rejectionReasons.join('\n'),
//       resubmission: {
//         required_documents: docsList,
//         timelines: {
//           'Resubmission period': ['7 days'],
//           'Reapplication fee': ['₹50'],
//         }
//       },
//       status: 'generated'
//     });
//     res.status(200).json({ success: true, message: 'Rejection PDF generated.' });
//   });
//
//   // fill in PDF
//   doc.fontSize(18).text(`Application Rejected`, { align: 'center' }).moveDown();
//   doc.fontSize(12).text(`Dear ${citizen.first_name},`).moveDown();
//   doc.text(`Your application for "${documentType}" has been rejected for the following reason(s):`).moveDown();
//   rejectionReasons.forEach(r => doc.text(`• ${r}`));
//   doc.moveDown();
//   doc.text(`Next Steps:`, { underline: true }).moveDown();
//   doc.text(`Please resubmit the following:`);
//   docsList.forEach(d => doc.text(`• ${d}`));
//   doc.moveDown();
//   doc.text(`Resubmission period: 7 days`);
//   doc.text(`Reapplication fee: ₹50`);
//   doc.end();
// };
//
// module.exports = { generatePDF };


const PDFDocument = require("pdfkit");
const GeneratedPDF = require("../../models/pdfGenerator/generatePdfSchema");
const PdfReason   = require("../../models/pdfGenerator/generatePdfReasonSchema");
const Citizen     = require("../../models/citizenDetails/citizenSchema");
const DocumentRule= require("../../models/verification/DocumentRule");
const { generateContent } = require("../../../nivaarak/src/service/geminiServices");


// Middleware `aiData ` must run before this to populate `req.aiData `.
async function generatePDF(req, res) {
  console.log("📄 generatePDF called");

  const { userId, documentType, rejectionReasons } = req.body;
  const aiData = req.geminiData || {};

  // Look up citizen and rule
  const citizen = await Citizen.findOne({ userId });
  const rule    = await DocumentRule.findOne({ docType: documentType });
  const docsList = rule?.requiredDocs?.get('required_documents') || [];

  // Build PDF
  // Kick off PDFKit stream…
  const doc = new PDFDocument();
  const buffers = [];
  doc.on("data", c => buffers.push(c));
  doc.on("end", async () => {
    // Persist the PDF and the AI‐generated reason object
    const pdfBuffer = Buffer.concat(buffers);

    const docTypeClean = documentType.trim();
    const docTypeKey   = docTypeClean.toLowerCase();

    // save generated PDF
    await GeneratedPDF.create({
      userId,
      name:           `${docTypeClean.replace(/\s+/g, "_")}.pdf`,
      documentType:   docTypeClean,  // human‐readable
      documentTypeKey: docTypeKey,   // machine‐friendly
      status:       rejectionReasons?.length ? "rejected" : "generated",
      pdfContent:   pdfBuffer.toString("base64"),
    });

    // save the LLaMA/Gemini reasons
    await PdfReason.create({
      userId,
      name:            `${documentType.replace(/\s+/g,"_")}-reason.pdf`,
      documentType:     docTypeClean,
      documentTypeKey:  docTypeKey,
      benefits:        aiData.benefits    || ["Not available"],
      eligibility:     aiData.eligibility || ["Not available"],
      rejectionReason: Array.isArray(rejectionReasons)
          ? rejectionReasons.join("\n")
          : "None",
      resubmission:    JSON.stringify({ /* … as before … */ }),
      status:          rejectionReasons?.length ? "rejected" : "generated",
    });

    return res.json({ success: true, message: "PDF generated." });
  });

  // Write your PDF content
  doc.fontSize(20).text(documentType, { align: "center" }).moveDown();

  // Use aiData.introduction / benefits / eligibility directly:
  doc.fontSize(12).text("Introduction:", { underline: true })
      .text(aiData.introduction || "N/A").moveDown();
  doc.text("Benefits:",     { underline: true })
      .text(Array.isArray(aiData.benefits)
          ? aiData.benefits.join("\n")
          : aiData.benefits || "N/A"
      ).moveDown();
  doc.text("Eligibility:",  { underline: true })
      .text(Array.isArray(aiData.eligibility)
          ? aiData.eligibility.join("\n")
          : aiData.eligibility || "N/A"
      ).moveDown();

  // … rest of your rejection and resubmission logic …

  doc.end();
}


module.exports = { generatePDF };
