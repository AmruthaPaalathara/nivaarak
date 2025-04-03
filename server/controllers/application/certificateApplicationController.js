const Certificate = require("../../models/application/certificateApplicationSchema");
const { processPdf } = require("../../extracting/extractDetails");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cleanupUploads = require("../../middleware/application/fileCleanUp");

// Constants
const ALLOWED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected"];

// Configure multer for file uploads
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, "../../../uploads/");
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // ✅ Dynamic & reliable
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, JPEG, and PNG are allowed."));
    }
  },
  limits: { fileSize: MAX_FILE_SIZE },
});

//  Middleware: Submit a new application
exports.submitApplication = [
  upload.array("files"),
  body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("Invalid email"),
  body("phone").trim().matches(/^\d{10}$/).withMessage("Phone number must be exactly 10 digits"),
  body("documentType").trim().notEmpty().withMessage("Document type is required"),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("agreementChecked")
    .custom((value) => {
      if (value !== true && value !== "true") {
        throw new Error("You must agree to the terms and conditions.");
      }
      return true;
    }),

  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }

      const { firstName, lastName, email, phone, documentType, state, agreementChecked } = req.body;

      // Ensure files are uploaded
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      const files = {};
      req.files.forEach((file) => {
        files[file.fieldname] = file.path;
      });

      // Process PDF to extract details
      let extractedDetails = null;
      if (files["documentFile"] && path.extname(files["documentFile"]).toLowerCase() === ".pdf") {
        extractedDetails = await processPdf(files["documentFile"]);
      }

      // Save application
      const newApplication = new Certificate({
        applicant: req.user.userId,
        firstName,
        lastName,
        email,
        phone,
        documentType,
        state,
        files,
        agreementChecked,
        status: "Pending",
        extractedDetails,
      });

      await newApplication.save();
      res.status(201).json({ message: "Application submitted successfully!", application: newApplication });
    } catch (error) {
      console.error("Application Submission Error:", error);
      if (res.locals.cleanupFiles) res.locals.cleanupFiles(); // Cleanup uploaded files
      res.status(500).json({ message: "Failed to submit application.", error: error.message });
    }
  },
];

//  Get all applications
exports.getApplications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const total = await Certificate.countDocuments();
    const applications = await Certificate.find()
      .populate("applicant", "username email")
      .select("-__v")
      .skip(skip)
      .limit(limit);

    if (!applications.length) {
      return res.status(200).json({ success: true, message: "No applications found", data: [] });
    }

    res.status(200).json({
      success: true,
      data: applications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching applications:", error);
    reportError(error);
    res.status(500).json({ success: false, error: "Failed to fetch applications." });
  }
};

//  Get application by ID
exports.getApplicationById = async (req, res) => {
  try {
    const application = await Certificate.findById(req.params.id).populate("applicant", "username email");
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    res.status(200).json(application);
  } catch (error) {
    console.error("Error fetching application:", error);
    reportError(error);
    res.status(500).json({ success: false, error: "Failed to fetch application." });
  }
};

//  Update application status (Approve/Reject)
exports.updateCertificateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    const updatedCertificate = await Certificate.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!updatedCertificate) {
      return res.status(404).json({ success: false, error: "Certificate not found" });
    }

    res.status(200).json({ success: true, message: "Status updated", certificate: updatedCertificate });
  } catch (error) {
    console.error("Error updating certificate status:", error);
    reportError(error);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
};

//  Delete a certificate application
exports.deleteCertificate = async (req, res) => {
  try {
    const deletedCertificate = await Certificate.findByIdAndDelete(req.params.id);
    if (!deletedCertificate) {
      return res.status(404).json({ success: false, error: "Certificate not found" });
    }
    res.status(200).json({ success: true, message: "Certificate deleted successfully" });
  } catch (error) {
    console.error("Error deleting certificate:", error);
    reportError(error);
    res.status(500).json({ success: false, error: "Failed to delete certificate" });
  }
};
