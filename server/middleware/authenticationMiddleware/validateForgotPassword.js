const { body, validationResult } = require('express-validator');

// Utility function to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((err) => ({
        field: err.param, // Change "path" to "param"
        message: err.msg,
      })),      
    });
  }
  next();
};

const validateForgotPassword = [
  // Validate and sanitize username
  body('username')
    .trim() // Remove leading/trailing whitespace
    .escape() // Sanitize to prevent XSS attacks
    .notEmpty()
    .withMessage('Username is required'),

  // Validate and sanitize new password
  body('newPassword')
    .trim() // Remove leading/trailing whitespace
    
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/)
    .withMessage('New password must include an uppercase letter, a number, and a special character'),

  // Validate confirm password
  body('confirmPassword')
    .trim() // Remove leading/trailing whitespace
    
    .notEmpty()
    .withMessage('Confirm password is required')
    .custom((value, { req }) => {
      if (!req.body.newPassword) {
        throw new Error('New password is required');
      }
      if (value !== req.body.newPassword) {
        throw new Error('New password and confirm password do not match');
      }
      return true;
    }),

  // Handle validation errors
  handleValidationErrors,
];

module.exports = validateForgotPassword;