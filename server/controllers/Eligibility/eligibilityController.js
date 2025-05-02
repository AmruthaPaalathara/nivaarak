// ===== server/controllers/Eligibility/eligibilityController.js =====
const tesseract = require("tesseract.js");
const path = require("path");
const fs = require("fs");
const Certificate = require("../../models/application/certificateApplicationSchema");
const User = require("../../models/authentication/userSchema");
const EligibilityCriteria = require("../../models/eligibility/eligibilitySchema");
const nodemailer = require("nodemailer");

const extractTextFromImage = async (filePath) => {
    const { data: { text } } = await tesseract.recognize(filePath, "eng+hin+mar");
    return text;
};

const verifyEligibility = async (req, res) => {
    try {
        const { applicantId, certificateType } = req.body;
        const files = req.files;

        const applicant = await User.findOne({ id: applicantId });
        if (!applicant) return res.status(404).json({ error: "Applicant not found" });

        const criteria = await EligibilityCriteria.findOne({ certificateType });
        if (!criteria) return res.status(404).json({ error: "Criteria not found" });

        const documentResults = [];
        for (const file of files) {
            const extractedText = await extractTextFromImage(file.path);
            documentResults.push({ file: file.originalname, extractedText });
        }

        const allCriteriaMet = criteria.requiredKeywords.every(keyword =>
            documentResults.some(doc => doc.extractedText.includes(keyword))
        );

        const certificate = await Certificate.create({
            applicant: applicantId,
            firstName: applicant.firstName,
            lastName: applicant.lastName,
            email: applicant.email,
            phone: applicant.phone,
            documentType: certificateType, // Ideally should reference UserDocument ObjectId
            files: {}, // You can populate this if you want to store paths
            extractedDetails: {}, // Can store extracted data here
            agreementChecked: true, // Assuming agreement is accepted by default
            emergencyLevel: req.body.emergencyLevel || "Low",
            requiredBy: req.body.requiredBy || null,
            status: allCriteriaMet ? "Approved" : "Rejected",
            rejectionReason: allCriteriaMet ? "" : "Eligibility conditions not met.",
            statusHistory: [
                {
                    status: allCriteriaMet ? "Approved" : "Rejected",
                    changedAt: new Date(),
                },
            ],
        });

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });

        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: applicant.email,
            subject: `Application ${certificate.status}: ${certificateType}`,
            text: allCriteriaMet
                ? "Your application has been approved."
                : "Your application has been rejected due to missing required document content.",
        });

        res.json({ certificate, documentResults });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

module.exports = { verifyEligibility };
