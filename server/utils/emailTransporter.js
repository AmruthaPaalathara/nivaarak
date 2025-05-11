const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("Initializing Nodemailer...");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});
console.log("Nodemailer transporter configured with email:", process.env.EMAIL_USER);
// Test Connection
transporter.verify((error, success) => {
    if (error) {
        console.error("SMTP Connection Error:", error);
    } else {
        console.log("SMTP Server is ready to send emails.");
    }
});

module.exports = transporter;
