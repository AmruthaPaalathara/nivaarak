const { body, validationResult } = require("express-validator");
const { User } = require("../../models/authentication/userSchema.js");

const validateRegistration = [
  // Sanitize and validate first name
  body("first_name")
    .trim()
    
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ max: 50 })
    .withMessage("First name must be less than 50 characters"),

  // Sanitize and validate last name
  body("last_name")
    .trim()
    
    .notEmpty()
    .withMessage("Last name is required")
    .isLength({ max: 50 })
    .withMessage("Last name must be less than 50 characters"),

  // Sanitize and validate username
  body("username")
    .trim()
    
    .notEmpty()
    .withMessage("Username is required")
    .isLength({ min: 3, max: 20 })
    .withMessage("Username must be between 3 and 20 characters")
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage("Username can only contain letters, numbers, and underscores")
    .custom(async (value) => {
      try {
          const user = await User.findOne({ username: value });
        if (user) {
            throw new Error("Username already in use");
        }
    } catch (error) {
          console.error("Error checking username:", error);
      throw new Error("Database error while checking username availability");
    }
  }),

  // Sanitize and validate email
  body("email")
    .trim()
    
    .isEmail()
    .withMessage("Invalid email format")
    .custom(async (value) => {
        const email = value.toLowerCase();
      console.log("Checking email:", value.toLowerCase());
      try {
          const existingUser = await User.findOne({ email });
          if (existingUser) {
              throw new Error("Email already in use");
          }
      } catch (err) {
          console.error("Database query error:", err);
          throw new Error("Database error while checking email availability");
      }
    }),

  // Validate phone number
  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^\d{10}$/)
    .withMessage("Phone number must be 10 digits"),

  // Validate password
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/)
    .withMessage("Password must include at least one uppercase letter")
    .matches(/[a-z]/)
    .withMessage("Password must include at least one lowercase letter")
    .matches(/\d/)
    .withMessage("Password must include at least one number")
    .matches(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/)
    .withMessage("Password must include at least one special character"),

  // Validate confirm password
  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error("Passwords do not match");
      }
      return true;
    }),

  // Handle validation errors
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log("Validation Errors:", errors.array()); // Log validation errors
      const formattedErrors = errors.array().map((err) => ({
        field: err.param,
        message: err.msg,
        statusCode: 400,
      }));
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: formattedErrors,
      });
    }
    next();
  },
];

module.exports = validateRegistration;