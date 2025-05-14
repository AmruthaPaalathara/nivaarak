//Handles authentication and authorization-related functionality.Manages user login, registration, password reset, and session management.

const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authentication/authController.js");
const validateRegistration = require("../../middleware/authenticationMiddleware/validateRegistration.js");
const validateLogin = require("../../middleware/authenticationMiddleware/validateLogin.js");
const validateForgotPassword = require("../../middleware/authenticationMiddleware/validateForgotPassword.js");
const { authenticateJWT } = require("../../middleware/authenticationMiddleware/authMiddleware.js");
const { loginLimiter, authLimiter, refreshLimiter } = require("../../middleware/rateLimiting.js");

// User Registration
router.post("/register",validateRegistration, authController.registerUser);

// User Login
router.post("/login", validateLogin, authController.loginUser);

// POST /auth/refresh-token (no throttle – so our auto-retries can’t be 429’d)
router.post("/refresh-token", authController.refreshToken);

// Verify Username for Forgot Password
router.post("/verify-username", authLimiter, authController.verifyUsername);

// Forgot Password: Accepts { email, newPassword }
router.post("/forgot-password", validateForgotPassword, authController.forgotPassword);

// Reset Password: Accepts { username, newPassword }
router.post("/reset-password", validateForgotPassword, authController.resetPassword);

// Get User Profile (Protected Route)
router.get("/profile", authenticateJWT(), authController.getUserProfile);

// Logout User (Protected Route)
router.post("/logout", authenticateJWT(), authController.logoutUser);

router.get("/test", (req, res) => {
    res.send("Auth route works!");
});

module.exports = router;