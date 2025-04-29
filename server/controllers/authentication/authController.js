const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { User, Counter } = require("../../models/authentication/userSchema.js");
const { validationResult } = require("express-validator");
const rateLimit = require("express-rate-limit");
const Session = require("../../models/authentication/sessionSchema.js");
const verifyRefreshToken = require("../../middleware/verifyRefreshToken");
const { isTokenRevoked } = require('../../middleware/authenticationMiddleware/authMiddleware');
const { v4: uuidv4 } = require('uuid');



// Rate limiting for login and registration (prevents brute-force attacks)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 5 requests per window
  message: "Too many requests, please try again later.",
});

// Validate password complexity using a helper function
const validatePassword = (password) => {
  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{8,}$/;
  return passwordRegex.test(password);
};

const getNextSequence = async (sequenceName) => {
  const counter = await Counter.findByIdAndUpdate(
      { _id: sequenceName },
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
  );
  return counter.sequence_value;
};

exports.registerUser = async (req, res) => {
  try {
    const { first_name, last_name, username, email, phone, password, confirmPassword } = req.body;

    // Trim inputs and normalize email
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim(); // <-- Define trimmedPassword here

    // Check if passwords match
    if (trimmedPassword !== confirmPassword.trim()) {
      return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    if (!validatePassword(trimmedPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.",
      });
    }

    // Check if user already exists (by email or username)
    const existingEmail = await User.findOne({ email: trimmedEmail });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: "Email already in use." });
    }

    const trimmedUsername = username.trim();
    const existingUser = await User.findOne({ username: trimmedUsername});
    if (existingUser) {
      return res.status(400).json({success: false, message:" Username already in use. "})
    }

    console.log("Saving password (trimmed):", trimmedPassword);
    // Create new user
    const newUser = new User({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      username: trimmedUsername,
      email: trimmedEmail,
      phone: phone.trim(),
      password: trimmedPassword,
    });

    console.log("User Object to Save:", newUser);

    await newUser.save();
    res.status(201).json({ success: true, message: "User registered successfully!" });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: "Registration failed. Please try again later." });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log("Login request received:", { username, password });

    if (!username  || !password) {
      return res.status(400).json({ success: false, message: "Username and password are required." });
    }
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim(); // <-- Make sure you trim password here
    //  Find user in the database
    const user = await User.findOne({ username: trimmedUsername });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    //  Compare password with hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid password. Try again." });
    }
    const tokenPayload = {  userId: user.userId, username: user.username };
    const accessToken = jwt.sign(  tokenPayload, process.env.JWT_SECRET, { expiresIn: "15m" });  // Short-lived
    const refreshToken = jwt.sign(tokenPayload, process.env.REFRESH_SECRET, { expiresIn: "30d" });  // Long-lived
    // Storing refresh token in httpOnly cookie (more secure approach):
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",  // Use secure cookies in production
      sameSite: "Strict",  // Prevents CSRF attacks
      maxAge: 30 * 24 * 60 * 60 * 1000  // 7 days
    });
    //  Generate unique session ID
    const sessionId = uuidv4();
    //  Create and store session in MongoDB
    const newSession = new Session({
      sessionId,
      userId: user.userId,
      deviceInfo: req.headers["user-agent"] || "Unknown Device",
      sessionType: "web",
      createdAt: new Date()
    });
    await newSession.save();
    //  Return JWT token and session ID to frontend
    return res.status(200).json({
      success: true,
      message: "Login successful",
      userId: user.userId,
      role: user.role,
      accessToken,   //  send accessToken
      sessionId, //  Include session ID for frontend tracking
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: "Login failed. Please try again later." });
  }
};

// Forgot Password (Reset Password)
exports.forgotPassword = async (req, res) => {
  try {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, newPassword } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ success: true, message: "Password reset successfully." });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password." });
  }
};

// Get User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const user = await User.findOne({  userId: req.user.userId }).select("-password"); // Exclude password
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: user.username,
      firstName: user.first_name,
      lastName: user.last_name,
      email: user.email,
      phone: user.phone
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Verify if a username exists
exports.verifyUsername = async (req, res) => {
  try {

    const { username } = req.body;

    if (!username) {
      return res.status(400).json({ success: false, message: "Username is required." });
    }

    // Trim the username for safety
    const user = await User.findOne({ username: username.trim() });

    if (user) {
      return res.status(200).json({ success: true, message: "Username exists." });
    } else {
      return res.status(404).json({ success: false, message: "Username not found." });
    }
  } catch (error) {
    console.error("Verify Username Error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
};

// Reset Password: Accepts { username, newPassword } and updates the password
exports.resetPassword = async (req, res) => {
  try {
    const { username, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }
    
    // Use the reusable validatePassword function
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and include an uppercase letter, a number, and a special character.",
      });
    }

    const user = await User.findOne({ username: username.trim() });
    if (!user) {
      return res.status(404).json({success: false, message: "User not found."});
    }

    // Hash and save the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findOneAndUpdate(
      { username: username.trim() },
      { password: hashedPassword }
    );
    res.json({ success: true, message: "Password reset successful!" });
  } catch (error) {
    console.error("Reset Password Error:", error);
    res.status(500).json({ success: false, message: "Failed to reset password." });
  }
};

// Logout User
exports.logoutUser = async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized request." });
    }
    // Remove all sessions for the user
    await Session.deleteMany({ userId: req.user.userId });
    res.status(200).json({ success: true, message: "Logout successful from all devices." });
  } catch (error) {
    console.error("Logout Error:", error);
    res.status(500).json({ success: false, message: "Logout failed. Please try again later." });
  }
};

exports.refreshToken = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Refresh Token required." });
    }

    jwt.verify(token, process.env.REFRESH_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ success: false, message: "Invalid or expired refresh token." });
      }

      // Optional: check if refresh token is revoked (if you store it)
      const isRevoked = await isTokenRevoked(token);
      if (isRevoked) {
        return res.status(403).json({ success: false, message: "Refresh token has been revoked." });
      }

      // Issue a new access token
      const newAccessToken = jwt.sign(
          { userId: decoded.userId, role: decoded.role }, // Include whatever info is needed
          process.env.JWT_SECRET,
          { expiresIn: "15m" }
      );

      // Generate new refresh token (for token rotation)
      const newRefreshToken = jwt.sign(
          { userId: decoded.userId, role: decoded.role },
          process.env.REFRESH_SECRET,
          { expiresIn: "30d" }
      );

      // Set new refresh token in the HTTP-only cookie
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "Strict",
        maxAge: 30 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Respond with the new access token
      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });
    });


  } catch (error) {
    console.error("Refresh Token Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.refreshAccessToken = [
  verifyRefreshToken, // Use the middleware to verify the refresh token from the HTTP-only cookie
  (req, res) => {
    const { userId } = req.user; // The user information is available after verifying the refresh token

    // Generate a new access token
    const newAccessToken = jwt.sign({ userId }, process.env.JWT_ACCESS_SECRET, { expiresIn: '1h' });

    res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      accessToken: newAccessToken,
    });
  },
];

exports.authLimiter = authLimiter;

