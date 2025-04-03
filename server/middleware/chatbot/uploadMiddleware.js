//import require modules
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const crypto = require("crypto");

// Ensure the "uploads" directory exists
const uploadDir = path.join(__dirname, "../uploads");
try{
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); //if such a directory doesn't exist then create it
}
} catch (error) {
  console.error(`Error creating upload directory: ${error.message}`);
}

// Sanitize filename (prevent from having invalid filename)
const sanitizeFilename = (filename) => {
  const sanitized = filename.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  return sanitized.length > 100 ? sanitized.slice(0, 100) : sanitized; // Limit filename to 100 characters
};


// Configure Multer storage
//Defines where and how uploaded files are stored.
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = sanitizeFilename(path.basename(file.originalname, ext));
    const uniqueId = crypto.randomBytes(6).toString("hex"); // 12-character random string
    cb(null, `${Date.now()}-${uniqueId}-${baseName}${ext}`);
  },
});


// File type validation
const allowedMimeTypes = ["application/pdf"];
const allowedExtensions = [".pdf"];

const fileFilter = (req, file, cb) => {
  const fileExt = path.extname(file.originalname).toLowerCase();
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type: ${file.mimetype}. Only PDF files are allowed.`), false);
  }

  if (!allowedExtensions.includes(fileExt)) {
    return cb(new Error(`Invalid file extension: ${fileExt}. Only .pdf files are allowed.`), false);
  }

  cb(null, true);
};


// Configure Multer with storage, file filter, and size limit
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } 
});


// Error handling middleware for file uploads
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    switch (err.code) {
      case "LIMIT_FILE_SIZE":
        return res.status(400).json({ error: "File size exceeds the allowed limit." });
      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({ error: "Unexpected file field detected." });
      default:
        return res.status(400).json({ error: `Multer error: ${err.message}` });
    }
  } else if (err) {
    console.error(`Upload error: ${err.message}`);
    return res.status(400).json({ error: `Upload failed: ${err.message}` });
  }
  next();
};


module.exports = { upload, uploadErrorHandler };
