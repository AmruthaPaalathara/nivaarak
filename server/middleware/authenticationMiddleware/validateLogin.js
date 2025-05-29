const { body, validationResult } = require('express-validator');

// Utility function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }
  next();
};

const validateLogin = [
  // Validate and sanitize username
  body('username')
    .trim() // Remove leading/trailing whitespace
    .notEmpty()
    .withMessage('Username is required'),

  // Validate and sanitize password
  body('password')
    .trim() // Remove leading/trailing whitespace
     // Sanitize to prevent XSS attacks
    .notEmpty()
    .withMessage('Password is required'),

  // Handle validation errors
  handleValidationErrors,
];

module.exports = validateLogin;