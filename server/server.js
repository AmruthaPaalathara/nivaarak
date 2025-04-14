
require("dotenv").config({ path: __dirname + "/.env" });
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require('express-rate-limit');
const helmet = require("helmet");
const morgan = require("morgan");
const nodemailer = require("nodemailer")
const path = require("path")
const fs = require("fs");

const documentRoutes = require("./routes/chatbot/documentRoute.js")
const authRoutes = require("./routes/authentication/authRoutes.js");
const certificateRoutes = require("./routes/application/certificateApplicationRoutes.js");
const generatePdfRoutes = require("./routes/pdfGeneration/generatePdfRoutes.js");
const chatbotRoutes = require("./routes/chatbot/chatRoutes.js");
const isAuthenticated = require("./middleware/authenticationMiddleware.js");
const { getUserDocuments } = require("./controllers/application/dropdownDocumentController");

const requiredEnvVars = [
  "JWT_SECRET",
  "MONGODB_URI",
  "PORT",
  "UPLOAD_DIR",
  "MAX_FILE_SIZE",
  "ALLOWED_FILE_TYPES",
  "EMAIL_USER",
  "EMAIL_PASS"
];

const app = express();

// Ensure Required Environment Variables Exist
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`ERROR: Missing required environment variable: ${envVar}. Exiting...`);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== "production") {
  console.log("Running in development mode.");
}

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet()); // Set security headers
app.use(morgan("combined")); // Log incoming requests

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000"];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Rate Limiting Setup
const globalLimiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS ? parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) : 15 * 60 * 1000,  // Default to 15 minutes if not set
  max: process.env.RATE_LIMIT_MAX ? parseInt(process.env.RATE_LIMIT_MAX, 10) : 100, // Default to 100 requests per window if not set
  message: "Too many requests, please try again later.",
});
app.use(globalLimiter);

// Nodemailer Setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
console.log('Email user:', process.env.EMAIL_USER);
console.log('Email pass:', process.env.EMAIL_PASS);



app.set("trust proxy", 1); // Trust the first proxy in front of your server

// Routes
app.use("/api/auth", authRoutes); // Authentication does not require login
app.use("/api/generate-pdf", isAuthenticated, generatePdfRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/chat", chatbotRoutes);
app.use("/api/documents", documentRoutes.router);

app.post("/send-email", async (req, res) => {
  console.log("📩  /send-email route hit");

  const { email } = req.body;
  console.log("📬  Target email:", email);

  const fixedPdfPath = path.join(__dirname, "Caste_Certificate.pdf");
  console.log("📄 Checking if PDF exists at:", fixedPdfPath);

  if (!fs.existsSync(fixedPdfPath)) {
    console.log("❌  PDF file not found:", fixedPdfPath);

    return res.status(400).json({ error: "PDF file not found on the server." });
  }

  // Email options
  const mailOptions = {
    from: process.env.EMAIL_USER, // Sender email (your Gmail)
    to: email, // Recipient email
    subject: "Below is the attached document mentioning the reasons for rejection of the request for the certificate", // Email subject
    text: "Please find the attached document.", // Email body
    attachments: [
      {
        filename: "Caste_Certificate.pdf", // Use the original file name
        path: fixedPdfPath, // Path to the uploaded file
      },
    ],
  };

  // Send email
  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Email sent:", info.response);
    res.status(200).json({ success: true, message: "Email sent successfully." });
  } catch (error) {

    console.error("❌ Error sending email:", error);
    console.log(error.response);
    res.status(500).json({ success: false, message: "Failed to send email." });
  }
});

// Connect to MongoDB
const connectToMongoDB = async (retries = 5) => {
  while (retries) {
    try {
      console.log("MongoDB URI:", process.env.MONGODB_URI);
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
      });
      console.log("Connected to MongoDB");
      return;
    } catch (err) {
      console.error(`MongoDB Connection Error (${retries} retries left):`, err);
      retries -= 1;
      await new Promise(res => setTimeout(res, 5000)); // Wait 5 seconds before retrying
    }
  }
  console.error("Could not connect to MongoDB. Exiting...");
  process.exit(1);
};

connectToMongoDB();


// Start Server
const PORT = process.env.PORT || 3001;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful Shutdown
const gracefulShutdown = async () => {
  try {
    console.log("Shutting down server...");

    await Promise.all([
      new Promise((resolve) => server.close(resolve)), // Close Express server
      mongoose.connection.close(), // Close MongoDB connection
    ]);

    console.log("Server and MongoDB connection closed.");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown); // Handle Ctrl+C

// Global Error Handler (MUST BE LAST)
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err.stack || err.message);
  res.status(500).json({ success: false, error: err.message || "Internal Server Error" });
});

