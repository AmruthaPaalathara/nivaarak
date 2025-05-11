const express = require('express');
const router = express.Router();
const { getStatusStats, getAdminApplicationChartStats} = require('../../../controllers/adminDashboard/charts/adminChartController');
const { authenticateJWT } = require('../../../middleware/authenticationMiddleware/authMiddleware');
const { isAdmin } = require("../../../middleware/rbac");
const { getAllAdminApplications, performTextExtraction, getDepartmentApplications, getStatusApplications} = require("../../../controllers/adminDashboard/adminDashboardController");

router.get("/", (req, res) => res.json({ success: true, message: "Admin Dashboard API is working!" }));
// @desc    Returns summarized stats (e.g., Approved/Rejected counts)
// @route   GET /api/dashboard/status-stats
router.get('/status-stats', authenticateJWT(), isAdmin, getStatusStats);

// Application chart stats
router.get("/admin-applications", authenticateJWT(), isAdmin, getAdminApplicationChartStats);

// Full application data
router.get('/all-applications', authenticateJWT(), isAdmin, getAllAdminApplications);

router.post("/check-documents/:applicationId", authenticateJWT(), isAdmin, authenticateJWT(), isAdmin, performTextExtraction);

router.get('/department-applications', authenticateJWT(), isAdmin, getDepartmentApplications);  // Correct endpoint for fetching department applications

router.get('/status-applications', authenticateJWT(), isAdmin, getStatusApplications);


module.exports = router;
