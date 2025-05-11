// certificateApplicationRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const basicMulterUpload = multer({ dest: "uploads/" });

const { getUserDocuments } = require("../../controllers/application/dropdownDocumentController");
const certificateController = require("../../controllers/application/certificateApplicationController");
const isAuthenticated = require("../../middleware/authenticationMiddleware");

const fileCleanUp = require("../../middleware/application/fileCleanUp");
 // Not destructured unless needed
const validateApplicationForm = require("../../middleware/application/validateApplication");
const { appUpload, handleUploadErrors } = require("../../middleware/multerConfigs");
const {authenticateUser} = require("../../middleware/authenticationMiddleware/authMiddleware"); // For file uploads

// In development only: mock middleware
if (process.env.NODE_ENV === 'development') {
  global.limiter = (req, res, next) => next();
  global.validateApplicationForm = (req, res, next) => next();
}

router.post("/submit", isAuthenticated, appUpload.any(),// Use upload middleware to handle file uploads
    handleUploadErrors,  // Handle file upload errors
    fileCleanUp,
    ...validateApplicationForm,  // Spread form validation middleware
    certificateController.submitApplication  // Handle the submission of the application
);


router.get("/all-document-types", certificateController.getAllDocumentTypes);
router.get("/user-documents", isAuthenticated, getUserDocuments);
router.get("/", isAuthenticated, certificateController.getApplications);
router.get("/document-types", isAuthenticated, certificateController.getDocumentTypes);
router.get("/user/:id/status", isAuthenticated, certificateController.getStatusByUserId);
router.put("/user/:id/status", isAuthenticated, certificateController.updateCertificateStatus);
router.get("/user/:id", isAuthenticated, certificateController.getApplicationById);
router.delete("/user/:id", isAuthenticated, certificateController.deleteCertificate);



module.exports = router;