//Handles user profile management and other user-specific actions.
//Focuses on actions related to the authenticated user (e.g., fetching, updating, or deleting their profile).


const express = require("express");
const router = express.Router();
const { getUserProfile, updateUserProfile, deleteUser } = require("../../controllers/userController");
const { authenticateJWT, authenticateSession } = require("../../middleware/authMiddleware");

// ✅ Choose authentication method (JWT or Session)
const authenticate = (req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    return authenticateJWT(req, res, next);
  }
  return authenticateSession(req, res, next);
};

// ✅ GET user profile (protected route)
router.get("/api/users/profile", authenticate, getUserProfile);

// ✅ UPDATE user profile (protected route)
router.put("/api/users/profile", authenticate, updateUserProfile);

// ✅ DELETE user (protected route)
router.delete("/api/users/profile", authenticate, deleteUser);

module.exports = router;