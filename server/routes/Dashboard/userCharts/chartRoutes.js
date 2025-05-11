const express = require("express");
const router = express.Router();
const { getUserApplicationStats } = require("../../../controllers/adminDashboard/charts/userChartController");
const { authenticateJWT } = require("../../../middleware/authenticationMiddleware/authMiddleware");

// @route   GET /api/dashboard/user/user-applications
// @desc    Get count of applications per document type for the logged-in user
// @access  Private
router.get("/user-applications", authenticateJWT(), getUserApplicationStats);

module.exports = router;