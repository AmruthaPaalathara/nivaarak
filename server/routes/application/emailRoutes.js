require("dotenv").config();
const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const transporter = require("../../utils/emailTransporter");
const GeneratedPDF = require("../../models/pdfGenerator/generatePdfSchema")



router.post("/send-email", async (req, res) => {
    const { email, documentType, userId } = req.body;

    console.log("Received request to send email:", req.body);

    if (!email || !documentType || !userId) {
        console.error("Email, Document Type, or User ID missing");
        return res.status(400).json({ success: false, message: "Email, document type, and user ID are required." });
    }

    try {
        const docTypeClean = documentType.trim();
        const docTypeKey   = docTypeClean.toLowerCase();

        console.log("Fetching generated PDF from database...");
        const pdfRecord = await GeneratedPDF
            .find({
                userId:       String(userId),
                documentTypeKey: docTypeKey
            })
            .sort({ createdAt: -1 })
            .limit(1);

        if (!pdfRecord.length) {
            console.log("Generated PDFs not found.");
            return res.status(200).json({ success: false, message: "No generated PDFs available for this user." });
        }

        // now `pdfRecord[0]` is the one we want
        const latestPdf = pdfRecord[0];
        const fileName = `${documentType.replace(/\s+/g, "_")}.pdf`;
        const filePath = path.join(__dirname, fileName);

        // write it out temporarily
        fs.writeFileSync(filePath, Buffer.from(latestPdf.pdfContent, "base64"));


        const attachments = pdfRecord.map((pdfRecord, index) => {
            const fileName = `${documentType.replace(/\s+/g, "_")}_${index + 1}.pdf`;
            const filePath = path.join(__dirname, fileName);
            fs.writeFileSync(filePath, Buffer.from(pdfRecord.pdfContent, "base64"));
            return { filename: fileName, path: filePath };
        });

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Information regarding your ${documentType} application`,
            text: "Please find the attached documents regarding your application.",
            attachments,
        };

        console.log("Attempting to send email...");
        const info = await transporter.sendMail(mailOptions);
        console.log("Email sent successfully. Message ID:", info.messageId);

        // Clean up
        attachments.forEach((file) => {
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        });

        return res.status(200).json({ success: true, message: "Email sent successfully." });

    } catch (error) {
        console.error("Error sending email:", error);
        return res.status(500).json({ success: false, message: "Failed to send email." });
    }
});
module.exports = router;
