const express = require("express");
const router = express.Router();

const {
  getUserProfile,
  updateUserProfile,
  deleteUser,
} = require("../../controllers/userDashboard/userController");

const {
  authenticateJWT,
  authenticateSession,
} = require("../../middleware/authenticationMiddleware/authMiddleware");

// Dynamic authentication method selector (JWT or Session)
const authenticate = (req, res, next) => {
  const isJWT = req.headers.authorization?.startsWith("Bearer ");
  const authMethod = isJWT ? authenticateJWT() : authenticateSession;
  authMethod(req, res, next);
};

// Protected Routes
router.get("/profile", authenticate, getUserProfile);
router.put("/profile", authenticate, updateUserProfile);
router.delete("/profile", authenticate, deleteUser);

module.exports = router;