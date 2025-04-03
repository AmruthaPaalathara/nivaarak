// certificateApplicationRoutes.js
const express = require("express");
const router = express.Router();
const { uploadMultiple, handleUploadErrors,validateUpload } = require("../../middleware/application/fileUpload");

// Mock controller and middleware for testing purposes
// Replace these with your actual imports in production
const isAuthenticated = (req, res, next) => next();
const limiter = (req, res, next) => next();
const validateApplicationForm = (req, res, next) => next();
const validateCertificateApplication = (req, res, next) => next();
const certificateController = {
  submitApplication: (req, res) => res.json({ message: "Form submitted" }),
  getApplications: (req, res) => res.json({ message: "Get applications" }),
  getApplicationById: (req, res) => res.json({ message: "Get application by ID" }),
  updateCertificateStatus: (req, res) => res.json({ message: "Status updated" }),
  deleteCertificate: (req, res) => res.json({ message: "Certificate deleted" })
};


// Full route - comment out middlewares one by one to isolate the issue
router.post(
  "/",
  limiter,
  isAuthenticated,
  uploadMultiple,
  validateUpload,
  handleUploadErrors,
  validateApplicationForm,
  validateCertificateApplication,
  certificateController.submitApplication
);

router.get("/", limiter, isAuthenticated, certificateController.getApplications);
router.get("/:id", limiter, isAuthenticated, certificateController.getApplicationById);
router.put("/:id/status", limiter, isAuthenticated, certificateController.updateCertificateStatus);
router.delete("/:id", limiter, isAuthenticated, certificateController.deleteCertificate);

module.exports = router;