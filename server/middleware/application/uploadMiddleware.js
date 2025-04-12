const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../../utils/logger");

// Configuration using environment variables
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../uploads/");
const allowedFileTypes = process.env.ALLOWED_FILE_TYPES || [ "application/pdf"];
const allowedExtensions = [".jpg", ".jpeg", ".png", ".pdf"]; // Allowed file extensions
const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB

// Ensure the uploads directory exists
try {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    logger.info(`Upload directory created: ${uploadDir}`);
  }
} catch (err) {
  logger.error(`Failed to create upload directory: ${err.message}`);
}

// Sanitize filename
const sanitizeFilename = (filename) => {
  return filename.replace(/[^a-zA-Z0-9_.-]/g, "_"); // Replace special characters with underscores
};

// Storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const documentType = req.body.documentType || "others"; // Default to 'others' if not provided
    const documentDir = path.join(uploadDir, documentType.replace(/\s+/g, "_").toLowerCase()); // Normalize folder name
    // Ensure document-type directory exists
    try {
      if (!fs.existsSync(documentDir)) {
        fs.mkdirSync(documentDir, { recursive: true });
        logger.info(`Created directory: ${documentDir}`);
      }
    } catch (err) {
      logger.error(`Failed to create directory: ${err.message}`);
      return cb(new Error("Failed to create directory for uploads"), false);
    }

    logger.info(`Uploading to: ${documentDir}`);
    cb(null, documentDir);
  },
  filename: (req, file, cb) => {
    const sanitizedFilename = sanitizeFilename(file.originalname);
    const uniqueFilename = `${Date.now()}-${sanitizedFilename}`;
    logger.info(`File saved as: ${uniqueFilename}`);
    cb(null, uniqueFilename);
  },
});

// File filter to allow only specific types and extensions
const fileFilter = (req, file, cb) => {
  const fileExtension = path.extname(file.originalname || "").toLowerCase();
  if (allowedFileTypes.includes(file.mimetype) && allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    logger.warn(`Rejected file: ${file.originalname} - Invalid type: ${file.mimetype}`);
    cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF is allowed.`), false);
  }
};

// Multer middleware
const upload = multer({
  storage,
  limits: { fileSize: maxFileSize }, // 5MB limit
  fileFilter,
});

// Error handling middleware for file uploads
const handleUploadErrors = (err, req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ success: false, error: "No file uploaded." });
  }

  if (err instanceof multer.MulterError) {
    // Multer errors (e.g., file size exceeded)
    logger.error(`Multer error: ${err.message}`);
    return res.status(400).json({ success: false, error: err.message });
  } else if (err) {
    // Other errors (e.g., invalid file type)
    logger.error(`File upload error: ${err.message}`);
    return res.status(400).json({ success: false, error: err.message });
  }
  next();
};

// Export middleware
module.exports = { upload, handleUploadErrors };
