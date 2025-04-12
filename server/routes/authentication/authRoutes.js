//Handles authentication and authorization-related functionality.Manages user login, registration, password reset, and session management.

const express = require("express");
const router = express.Router();
const authController = require("../../controllers/authentication/authController.js");
const validateRegistration = require("../../middleware/authenticationMiddleware/validateRegistration.js");
const validateLogin = require("../../middleware/authenticationMiddleware/validateLogin.js");
const validateForgotPassword = require("../../middleware/authenticationMiddleware/validateForgotPassword.js");
const { authenticateJWT } = require("../../middleware/authenticationMiddleware/authMiddleware.js");
const { loginLimiter, authLimiter } = require("../../middleware/rateLimiting.js");

// User Registration
router.post("/register", authLimiter,validateRegistration, authController.registerUser);


// User Login
router.post("/login", authLimiter, loginLimiter, validateLogin, authController.loginUser);

// Verify Username for Forgot Password
router.post("/verify-username", authLimiter, authController.verifyUsername);

// Forgot Password: Accepts { email, newPassword }
router.post("/forgot-password", authLimiter, validateForgotPassword, authController.forgotPassword);

// Reset Password: Accepts { username, newPassword }
router.post("/reset-password", authLimiter, validateForgotPassword, authController.resetPassword);

// Get User Profile (Protected Route)
router.get("/profile", authenticateJWT(), authLimiter, authController.getUserProfile);

// Logout User (Protected Route)
router.post("/logout", authenticateJWT(),authLimiter, authController.logoutUser);


module.exports = router;