const { body, validationResult } = require('express-validator');

const validateOTP = [
    body('phone').trim().notEmpty().withMessage('Phone number is required'),
    body('otp').trim().notEmpty().withMessage('OTP is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }
        next();
    },
];

module.exports = validateOTP;