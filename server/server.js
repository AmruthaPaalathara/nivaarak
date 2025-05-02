
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
mongoose.set("debug", true);


const authRoutes = require("./routes/authentication/authRoutes");
const certificateRoutes = require("./routes/application/certificateApplicationRoutes.js");
const emailRoutes = require("./routes/application/emailRoutes");
const generatePdfRoutes = require("./routes/pdfGeneration/generatePdfRoutes.js");
const chatbotRoutes = require("./routes/chatbot/chatRoutes.js");
const isAuthenticated = require("./middleware/authenticationMiddleware.js");
const { getUserDocuments } = require("./controllers/application/dropdownDocumentController");
const  documentRouter  = require("./routes/chatbot/documentRoute");
const priorityApplicationRoutes = require('./routes/application/priorityApplicationRoutes');
const userRoutes = require("./routes/Dashboard/dashboardRoutes");
const chartRoutes = require('./routes/Dashboard/userCharts/chartRoutes');
const adminRoutes = require("./routes/Dashboard/adminCharts/chartRoutes");
const eligibilityRoutes = require("./routes/eligibility/eligibilityRoutes");

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

if (process.env.NODE_ENV !== "production") {
}

// Middleware Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(helmet()); // Set security headers
app.use(morgan("combined")); // Log incoming requests

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : ["http://localhost:3000", "http://localhost:3001"];
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

app.set("trust proxy", 1); // Trust the first proxy in front of your server

app.use((req, res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  console.log(`Incoming request: ${req.method} ${req.url}`);

  next();
});


// Routes
app.use("/api/auth", authRoutes); // Authentication does not require login
app.use("/api/generate-pdf", isAuthenticated, generatePdfRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/chat", chatbotRoutes);
app.use("/api/documents", documentRouter);
// Then mount it just like others:
app.use("/api/email", emailRoutes);
app.use("/api/pdf", generatePdfRoutes);
app.use('/api/priority-applications', priorityApplicationRoutes);
app.use("/api/users", userRoutes);
app.use('/api/userCharts', chartRoutes);
app.use("/api/admin-dashboard", adminRoutes);
app.use("/api/eligibility", eligibilityRoutes);


// Connect to MongoDB
const connectToMongoDB = async (retries = 5) => {
  while (retries) {
    try {

      await mongoose.connect(process.env.MONGODB_URI, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
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


