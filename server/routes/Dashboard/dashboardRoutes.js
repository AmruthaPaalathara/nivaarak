const express = require("express");
const router = express.Router();

const { getUserProfile, updateUserProfile, deleteUser } = require("../../controllers/adminDashboard/userDashboardController");
const { User } = require("../../models/authentication/userSchema")
const { authenticateJWT, authenticateSession, } = require("../../middleware/authenticationMiddleware/authMiddleware");
const { isUser, isAdmin } = require("../../middleware/rbac");
const { performTextExtraction, getDepartmentApplications } = require("../../controllers/adminDashboard/adminDashboardController");

// Dynamic authentication method selector (JWT or Session)
const authenticate = (req, res, next) => {
  const isJWT = req.headers.authorization?.startsWith("Bearer ");
  const authMethod = isJWT ? authenticateJWT() : authenticateSession;
  authMethod(req, res, next);
};

// Protected Routes
router.get("/profile", authenticateJWT(), (req, res) => {
  const userRole = req.user?.role;
  const userId = req.user.userId;
  if (!userRole) {
    return res.status(403).json({ success: false, error: "No role found in token" });
  }

  if (userRole === "admin") {
    // Fetch admin profile
    return User.findOne({ userId: userId })
        .select("-password")
        .then((admin) => res.json({ success: true, data: { user: admin } }))
        .catch((err) =>
            res.status(500).json({ success: false, error: "Failed to fetch admin profile" })
        );
  } else if (userRole === "user") {
    // Fetch user + stats (as your original logic)
    // You can reuse existing logic from getUserProfile
    console.log("Calling getUserProfile for userId:", req.user.userId);

    return getUserProfile(req, res);
  } else {
    return res.status(403).json({ success: false, error: "Invalid role" });
  }
});

router.put("/profile", authenticate, isUser, updateUserProfile);
router.delete("/profile", authenticate, isUser, deleteUser);

// routes/adminDashboardRoutes.js


module.exports = router;