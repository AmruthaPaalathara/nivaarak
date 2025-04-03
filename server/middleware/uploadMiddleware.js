const multer = require("multer");
const fs = require("fs");
const path = require("path");

// Ensure the "uploads" folder exists
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer to store files in the "uploads" folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

// Validate file type (only allow PDFs)
const fileFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true); // Accept the file
  } else {
    cb(new Error("Invalid file type. Only PDF files are allowed."), false); // Reject the file with a descriptive error
  }
};

// Configure multer with storage, file filter, and size limit
const MAX_FILE_SIZE = process.env.MAX_FILE_SIZE || 10 * 1024 * 1024; // Default to 10 MB
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE }, // Use configurable file size limit
});

// Middleware to handle Multer errors
const handleMulterErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors (e.g., file size exceeded)
    return res.status(400).json({ success: false, message: err.message });
  } else if (err) {
    // Other errors (e.g., file type validation)
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = { upload, handleMulterErrors };