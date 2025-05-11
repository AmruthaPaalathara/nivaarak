const { body, validationResult } = require("express-validator");

// Centralized error handler
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

const validateOTP = [
    body("phone")
        .trim()
        .notEmpty().withMessage("Phone number is required")
        .isMobilePhone("en-IN").withMessage("Invalid phone number format"),

    body("otp")
        .trim()
        .notEmpty().withMessage("OTP is required")
        .isLength({ min: 4, max: 6 }).withMessage("OTP must be between 4 and 6 digits")
        .isNumeric().withMessage("OTP must contain only numbers"),

    handleValidationErrors,
];

module.exports = validateOTP;
