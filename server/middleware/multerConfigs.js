const multer = require("multer");
const path = require("path");
const fs = require("fs");
const logger = require("../utils/logger");

const maxFileSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
const allowedFileTypes = ["application/pdf"];
const allowedExtensions = [".pdf"];

// Sanitize filename
const sanitizeFilename = (filename) => filename.replace(/[^a-zA-Z0-9_.-]/g, "_");

const ensureDir = (dir) => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created upload directory: ${dir}`);
    }
};

// Shared file filter
const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFileTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        logger.warn(`Rejected file: ${file.originalname}`);
        cb(new Error(`Invalid file type: ${file.mimetype}`), false);
    }
};

// Application upload
const appStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const docType = req.body.documentType || "others";
        const dir = path.join(__dirname, "../uploads/applications", docType.replace(/\s+/g, "_").toLowerCase());
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const name = sanitizeFilename(file.originalname);
        cb(null, `${Date.now()}-${name}`);
    }
});

// Chatbot upload
const chatbotStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const dir = path.join(__dirname, "../uploads/chatbot");
        ensureDir(dir);
        cb(null, dir);
    },
    filename: (req, file, cb) => {
        const name = sanitizeFilename(file.originalname);
        cb(null, `${Date.now()}-${name}`);
    }
});

const appUpload = multer({
    storage: appStorage,
    limits: { fileSize: maxFileSize },
    fileFilter
});

const chatbotUpload = multer({
    storage: chatbotStorage,
    limits: { fileSize: maxFileSize },
    fileFilter
});

const handleUploadErrors = (err, req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, error: "No file uploaded." });
    }
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
};

module.exports = {
    appUpload,
    chatbotUpload,
    handleUploadErrors
};
