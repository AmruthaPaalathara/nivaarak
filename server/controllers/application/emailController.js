// server/controllers/application/emailController.js
const path = require('path');
const fs   = require('fs');
const transporter = require('../../utils/emailTransporter');
const GeneratedPDF = require('../../models/pdfGenerator/generatePdfSchema');

exports.sendGeneratedPdfs = async (req, res) => {
    const { email, documentType, userId } = req.body;
    if (!email || !documentType || !userId) {
        return res.status(400).json({ success: false, message: 'email, documentType, and userId are required' });
    }

    try {

        const tmpDir = path.join(__dirname, '..', '..', 'tmp');

// ✅ Create tmp directory if it doesn't exist
        if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir);
        }

        // fetch latest PDF(s) for this user & documentType
        const latest = await GeneratedPDF.findOne({
            userId: String(userId),
            documentType: documentType.trim(),
            status: { $in: ['generated', 'rejected'] }
        })
            .sort({ createdAt: -1 });

        if (!latest || !latest.pdfContent) {
            return res.status(404).json({ success: false, message: 'No valid PDF found' });
        }

        const safeName = documentType.replace(/[^a-z0-9]/gi, "_").toLowerCase();
        const filename = `${safeName}_certificate.pdf`;
        const filePath = path.join(tmpDir, filename);

        fs.writeFileSync(filePath, Buffer.from(latest.pdfContent, 'base64'));

        const attachments = [{ filename, path: filePath }];


        // send mail
        console.log("📤 Sending email with PDF:", filename);
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: `Your ${documentType} PDF`,
            text: 'Please find your generated PDF(s) attached.',
            attachments
        });

        // cleanup temp files
        attachments.forEach(a => fs.unlinkSync(a.path));

        res.json({ success: true, message: 'Email sent with attachments.' });
    } catch (err) {
        console.error('sendGeneratedPdfs error:', err);
        res.status(500).json({ success: false, message: 'Failed to send email.' });
    }
};
