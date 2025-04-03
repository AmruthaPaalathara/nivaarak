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
    // Sanitize to prevent XSS attacks
    .notEmpty()
    .withMessage('Username is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters'),

  // Validate and sanitize password
  body('password')
    .trim() // Remove leading/trailing whitespace
     // Sanitize to prevent XSS attacks
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),

  // Handle validation errors
  handleValidationErrors,
];

module.exports = validateLogin;