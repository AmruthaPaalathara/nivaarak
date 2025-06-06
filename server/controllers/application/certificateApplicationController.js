const Certificate = require("../../models/application/certificateApplicationSchema");
const UserDocument = require("../../models/application/userDocumentSchema");
const  { User }  = require("../../models/authentication/userSchema");
const DepartmentMapping = require('../../models/application/DepartmentMapping');
const { processPdf } = require("../../middleware/chatbot/extractDetails");
const { body, validationResult } = require("express-validator");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cleanupUploads = require("../../middleware/application/fileCleanUp");
const { extractTextFromPdf } = require("../../OCR/Applicationextracting/process_uploaded_docs");

// Constants
const ALLOWED_FILE_TYPES = ["application/pdf"];
const ALLOWED_STATUSES = ["Pending", "Approved", "Rejected", "Processing"];
const ALLOWED_DOCUMENT_TYPES = [
  "Birth Certificate",
  "Death Certificate",
  "Income Certificate",
  "Domicile Certificate",
  "Caste Certificate",
  "Agricultural Certificate",
  "Non- Creamy Layer",
  "Property Documents",
  "Marriage Certificates",
  "Senior Citizen Certificate",
  "Solvency Certificate",
  "Shop and Establishment Registration",
  "Contract Labour License",
  "Factory Registration Certificate",
  "Boiler Registration Certificate",
  "Landless Certificate",
  "New Water Connection"
];

// Configure multer for file uploads
const uploadDir = process.env.APPLICATION_UPLOAD_DIR || path.join(__dirname, "../../../uploads/applications/");
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024; // 5MB
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.userId || req.user.userId; // Ensure userId is passed
    const docType = file.fieldname.replace(/\s+/g, '_').toLowerCase(); // Clean field name
    const ext = path.extname(file.originalname); // e.g., .pdf
    const uniqueFileName = `${userId}_${docType}_${Date.now()}${ext}`;
    cb(null, uniqueFileName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (ALLOWED_FILE_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF is allowed."));
    }
  },
  limits: { fileSize: MAX_FILE_SIZE },
});

exports.getAllDocumentTypes = (req, res) => {
  const allTypes = [
    "Birth Certificate",
    "Death Certificate",
    "Income Certificate",
    "Domicile Certificate",
    "Caste Certificate",
    "Agricultural Certificate",
    "Non- Creamy Layer",
    "Property Documents",
    "Marriage Certificates",
    "Senior Citizen Certificate",
    "Solvency Certificate",
    "Shop and Establishment Registration",
    "Contract Labour License",
    "Factory Registration Certificate",
    "Boiler Registration Certificate",
    "Landless Certificate",
    "New Water Connection"
  ];

  res.json({ documentTypes: allTypes });
};

//  Middleware: Submit a new application
exports.submitApplication = [
body("firstName").trim().notEmpty().withMessage("First name is required"),
  body("lastName").trim().notEmpty().withMessage("Last name is required"),
  body("email").trim().isEmail().withMessage("Invalid email"),
  body("phone").trim().matches(/^\d{10}$/).withMessage("Phone number must be exactly 10 digits"),

  body("documentType").trim().notEmpty().withMessage("Document type is required").isIn(ALLOWED_DOCUMENT_TYPES).withMessage(`Invalid document type. Allowed types: ${ALLOWED_DOCUMENT_TYPES.join(", ")}`),
  body("state").trim().notEmpty().withMessage("State is required"),
  body("agreementChecked").custom((value) => {
    if (value !== true && value !== "true") {
      throw new Error("You must agree to the terms and conditions.");
    }
    return true;
  }),
  body("emergencyLevel")
      .optional()
      .isIn(["Critical", "High", "Medium", "Low"])
      .withMessage("Invalid emergency level"),

  body("requiredBy")
      .optional()
      .isISO8601()
      .withMessage("Invalid date format for requiredBy"),

async (req, res) => {

    const errors = validationResult(req);
    console.log(errors.array())

    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {

      if (!req.user || !req.user.userId) {
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }

      console.log(">> Multer parsed files:", req.files);

      const { firstName, lastName, email, phone, agreementChecked, state, documentType, emergencyLevel, requiredBy } = req.body;
      const userId = req.user.userId;


      const userExists = await User.findOne({ userId: userId });

      if (!userExists) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch department dynamically from database
      const departmentMapping = await DepartmentMapping.findOne({ documentType });
      if (!departmentMapping) {
        return res.status(400).json({ message: 'Invalid document type or no department mapping found' });
      }

      const department = departmentMapping.department;

      // Ensure files are uploaded
      if (!req.files || req.files.length === 0) {
        console.log("req.files:", req.files);
        console.log("No files uploaded");
        return res.status(400).json({ message: "No files uploaded" });
      }

      const uploadedFiles = {};
        req.files.forEach((file) => {
          const rawKey = file.fieldname.replace(/^files\[/, "").replace(/\]$/, "");
          const key = rawKey.replace(/[^a-zA-Z0-9_-]/g, "_"); // sanitize for Mongo
          if (!uploadedFiles[key]) {
            uploadedFiles[key] = [];
          }
          uploadedFiles[key].push(path.relative(uploadDir, file.path));
        });

        console.log("uploaded files:", uploadedFiles);

      const allUploadedPaths = Object.values(uploadedFiles).flat();

      // Check if a UserDocument entry exists for this user and documentType
    let userDocument = await UserDocument.findOne({ userId, documentType });

      // If it doesn't exist, create a new entry
      if (!userDocument) {
        userDocument = new UserDocument({
          userId,
          documentType,
          files: uploadedFiles,
          submittedAt: new Date()
        });
      } else {
        // Update the document if it already exists
        for (const key in uploadedFiles) {
          if (!userDocument.files[key]) {
            userDocument.files[key] = [];
          }
          userDocument.files[key].push(...uploadedFiles[key]);

        }

        userDocument.submittedAt = new Date();
      }

      try {
        await userDocument.save();

      } catch (err) {
        console.error("Error saving UserDocument:", err);
      }

      const extractedDetails = {};
      for (const [label, filePaths] of Object.entries(uploadedFiles)) {
        if (filePaths?.length > 0) {
          const filePath = path.join(uploadDir, filePaths[0]); // Only 1 file per field
          try {
            console.log("Starting OCR for", label, filePath);
            const result = await extractTextFromPdf(filePath);
            console.log("OCR result for", label, ":", result.status);
            if (result.status === "success") {
              extractedDetails[label] = result.text;
            } else {
              extractedDetails[label] = "OCR Failed";
            }
          } catch (err) {
            extractedDetails[label] = "Extraction Error: " + err.message;
          }
        }
      }

      console.log("extracted details:", extractedDetails);

      console.log("details saving to mongodb while application form submission", req.body);
      // Save application
      const newApplication = new Certificate({
        applicant: userId,
        firstName,
        lastName,
        email,
        phone,
        department,
        documentType,
        state,
        files: uploadedFiles,
        flatFiles: allUploadedPaths,
        agreementChecked: agreementChecked === "true" || agreementChecked === true,
        emergencyLevel,
        requiredBy,
        status: "Pending",
        extractedDetails,
      });


      await newApplication.save();

      res.status(201).json({  success: true, message: "Application submitted successfully!", application: newApplication });
    } catch (error) {
      console.error("Application Submission Error:", error);

    // Cleanup uploaded files on error
      if (res.locals.cleanupFiles) {
        res.locals.cleanupFiles();
      }
      res.status(500).json({ success: false, message: "Server error during application submission" });
}
  },
];

//  Get all applications
exports.getApplications = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page)) || 1;
    const limit = Math.max(1, parseInt(req.query.limit)) || 10;
    const skip = (page - 1) * limit;

    const userId = req.user?.userId;
    const query = req.user?.role === 'admin' ? {} : { applicant: userId };


    const total = await Certificate.countDocuments(query);
    const rawApps = await Certificate.find(query)

        .select("-__v")
        .skip(skip)
        .limit(limit)
        .lean();

    // 2) Pull out all the documentType strings
    const docTypes = [...new Set(rawApps.map(app => app.documentType))];

// 3) Fetch the matching UserDocuments by their documentType field
    const userDocs = await UserDocument.find({
      userId,
      documentType: { $in: docTypes }
    })
        .select("documentType files submittedAt")
        .lean();

// 4) Build a map for quick lookup
    const docMap = userDocs.reduce((m, doc) => {
      m[doc.documentType] = doc;
      return m;
    }, {});

    // 5) Merge into your final payload
    const applications = rawApps.map(app => ({
      ...app,
      files:         docMap[app.documentType]?.files        || {},
      submittedAt:   docMap[app.documentType]?.submittedAt  || app.createdAt,
      createdAtFormatted: new Date(app.createdAt).toLocaleString("en-IN", { /* … */ }),
      updatedAtFormatted: new Date(app.updatedAt).toLocaleString("en-IN", { /* … */ }),
    }));

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
    res.status(500).json({ success: false, error: "Failed to fetch applications." });
  }
};

//  Get application by ID
exports.getApplicationById = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const application = await Certificate.find({ applicant: userId  });
    if (!application) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }
    res.status(200).json(application);
  } catch (error) {
    console.error("Error fetching application:", error);

    res.status(500).json({ success: false, error: "Failed to fetch application." });
  }
};

//  Update application status (Approve/Reject)
exports.updateCertificateStatus = async (req, res) => {
  try {

    const userId = parseInt(req.params.id);
    const { status, rejectionReason  } = req.body;

    if (!ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }
    // Fetch the certificate application
    const application = await Certificate.findById(id);
    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    if (status === "Rejected") {
      if (!rejectionReason || rejectionReason.trim() === "") {
        return res.status(400).json({
          success: false,
          error: "Rejection reason is required when status is 'Rejected'",
        });
      }
      application.rejectionReason = rejectionReason;
    } else {
      application.rejectionReason = ""; // Clear old reason
    }

    // Update status and statusHistory
    application.status = status;
    application.statusHistory.push({
      status,
      changedAt: new Date()
    });

    await application.save();

    return res.json({
      success: true,
      message: `Status updated to ${status}`,
      updatedStatus: application.status,
      applicationId: id
    });

  } catch (err) {
    console.error('Error updating certificate status:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

//  Delete a certificate application
exports.deleteCertificate = async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const deletedCertificate = await Certificate.findOneAndDelete({ applicant: userId });
    if (!deletedCertificate) {
      return res.status(404).json({ success: false, error: "Certificate not found" });
    }
    res.status(200).json({ success: true, message: "Certificate deleted successfully", deleted: deletedCertificate,  });
  } catch (error) {
    console.error("Error deleting certificate:", error);

    res.status(500).json({ success: false, error: "Failed to delete certificate" });
  }
};

exports.getDocumentTypes = (req, res) => {
  res.status(200).json({ success: true, documentTypes: ALLOWED_DOCUMENT_TYPES });
};

exports.getStatusByUserId = async (req, res) => {
  try {
    const userId = parseInt(req.params.id); // Ensure it's a number

    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: "Invalid user ID" });
    }

    const certificate  = await Certificate.findOne({ applicant: userId })
        .select("status rejectionReason statusHistory");

    if (!certificate) {
      return res.status(404).json({ error: "Application not found" });
    }

    res.status(200).json({ success: true, status: certificate.status, data: certificate });
  } catch (err) {
    console.error("Error fetching status by user ID:", err);
    res.status(500).json({ success: false,  error: "Failed to fetch status" });
  }
};

