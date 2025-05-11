const { body, validationResult } = require("express-validator");

// Predefined list of allowed document types
const allowedDocumentTypes = [
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

const validateApplicationForm = [
  // Validate and sanitize inputs
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .escape(), // Sanitize to prevent XSS

  body("lastName")
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
        if (!/^[6-9]\d{9}$/.test(value)) {
        throw new Error("Phone number must be 10 digits");
      }
      return true;
    }),

  body("documentType")
    .trim()
    .notEmpty()
    .withMessage("Document type is required")
    .isIn(allowedDocumentTypes)
      .withMessage("Please select a valid document type from the list provided"),

    body("state")
    .trim()
    .notEmpty()
    .withMessage("State is required")
    .escape(), // Sanitize to prevent XSS

    body("emergencyLevel")
        .optional()
        .isIn(["Low", "Medium", "High"])
        .withMessage("Invalid emergency level"),

    body("requiredBy")
        .optional()
        .isISO8601()
        .withMessage("Invalid date format for deadline (requiredBy)")
        .toDate(),


    body("agreementChecked")
      .custom((value) => {
        if (!(value === true || value === "true" || value === "on")) {
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