const { body, validationResult } = require("express-validator");

// Predefined list of allowed document types
const allowedDocumentTypes = [
  "Birth Certificate",
  "Income Certificate",
  "Domicile Certificate",
  "Caste Certificate",
  "Marriage Certificate",
  "Land Records",
  "Property Documents",
  "Educational Certificates",
  "Pension Documents",
  "Other",
];

const validateApplicationForm = [
  // Validate and sanitize inputs
  body("first_name")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .escape(), // Sanitize to prevent XSS

  body("last_name")
    .trim()
    .notEmpty()
    .withMessage("Last name is required")
    .escape(), // Sanitize to prevent XSS

  body("email")
    .trim()
    .isEmail()
    .withMessage("Please enter a valid email address")
    .normalizeEmail(), // Normalize email address

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .custom((value) => {
      if (!/^\d{10}$/.test(value)) {
        throw new Error("Phone number must be 10 digits");
      }
      return true;
    }),

  body("documentType")
    .trim()
    .notEmpty()
    .withMessage("Document type is required")
    .isIn(allowedDocumentTypes)
    .withMessage("Invalid document type"),

  body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .escape(), // Sanitize to prevent XSS

  body("agreementChecked")
    .custom((value) => {
      if (value !== true && value !== "true") { // Handle both boolean and string values
        throw new Error("You must agree to the terms and conditions.");
      }
      return true;
    }),
  

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      console.error("Validation Errors:", errors.array()); // Log errors in the console
      return res.status(400).json({ success: false, errors: errors.array() });
    }
    
    next();
  },
];

module.exports = validateApplicationForm;