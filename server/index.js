// const express = require("express");
// const mongoose = require("mongoose");
// const cors = require("cors");

// const app = express();
// app.use(express.json());
// app.use(cors());

// // Connect to MongoDB
// mongoose.connect("mongodb://localhost:27017/nivaarak", {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
// })
// .then(() => console.log("MongoDB Connected"))
// .catch(err => console.error("MongoDB Connection Error:", err));

// // Import and Use Routes
// const applicantRoutes = require("./routes/applicantRoutes");
// app.use("/api", applicantRoutes);

// // Start Server
// const PORT = 3001;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });


const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const errorHandler = require("./middleware/errorHandler"); // Import Error Middleware

const certificateRoutes = require("./routes/application/certificateApplicationRoutes.js");
const documentRoutes = require("./routes/chatbot/documentRoute.js");

const app = express();

// CORS Configuration
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS not allowed for this origin"));
    }
  },
  credentials: true,
}));

// Middleware
app.use(cookieParser());
app.use(express.json());

// MongoDB Connection with Retry Logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB Connection Error:", error);
    setTimeout(connectDB, 5000); // Retry after 5 seconds
  }
};

connectDB();

// Handle MongoDB disconnections
mongoose.connection.on("disconnected", () => {
  console.error("MongoDB disconnected! Reconnecting...");
  connectDB();
});

// Routes
app.use("/api/certificates", certificateRoutes);
app.use("/api/documents", documentRoutes);

// Error Handling Middleware (MUST BE LAST)
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

// Global Error Handling
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise Rejection:", err);
});
