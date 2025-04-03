// fileUpload.js
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Define Upload Directory
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../../uploads/");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log(`Upload directory created: ${uploadDir}`);
}

// Define Allowed File Types
const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

// Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = file.originalname.replace(/[^a-zA-Z0-9_.-]/g, "_");
    cb(null, `${Date.now()}-${sanitizedFilename}`);
  },
});

// File Filter
const fileFilter = (req, file, cb) => {
  if (allowedFileTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error(`Rejected file: ${file.originalname} - Invalid type: ${file.mimetype}`);
    cb(new Error("Invalid file type. Only PDF, JPG, and PNG are allowed."), false);
  }
};

const validateUpload = (req, res, next) => {
  if (!req.files || Object.keys(req.files).length === 0) {
    return res.status(400).json({ success: false, error: "No files uploaded." });
  }
  next();
};

// Create the middleware directly - no function wrapper
const uploadMultiple = multer({
  storage,
  limits: { fileSize: maxFileSize },
  fileFilter
}).fields([
  { name: "documentFile", maxCount: 1 },
  { name: "idProof", maxCount: 1 }
]);

// Error handling middleware
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    console.error(`File upload error: ${err.message}`);
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
};

module.exports = {
  uploadMultiple,
  handleUploadErrors,
  validateUpload
};