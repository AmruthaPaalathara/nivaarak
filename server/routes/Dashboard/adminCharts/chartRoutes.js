const express = require('express');
const router = express.Router();
const { getStatusStats, getAdminApplicationChartStats} = require('../../../controllers/adminDashboard/charts/adminChartController');
const { authenticateJWT } = require('../../../middleware/authenticationMiddleware/authMiddleware');
const { isAdmin } = require("../../../middleware/rbac");
const { getAllAdminApplications, performTextExtraction, getAllDepartments, getDepartmentApplications, getStatusApplications} = require("../../../controllers/adminDashboard/adminDashboardController");
const {verifyContextMatch} = require("../../../controllers/adminDashboard/ragCheckController");

router.get("/", (req, res) => res.json({ success: true, message: "Admin Dashboard API is working!" }));
// @desc    Returns summarized stats (e.g., Approved/Rejected counts)

router.get('/status-stats',authenticateJWT(), isAdmin, getStatusStats);

// Application chart stats
router.get( "/admin-applications",
    authenticateJWT(["admin"]),               // ← verify JWT & require role
    (req, res, next) => {                     // ← now req.user.role will exist
        console.log("🕵️‍♂️ req.user.role:", req.user.role);
        next();
    },
    isAdmin,
    getAdminApplicationChartStats
);

// Full application data
router.get('/all-applications',  authenticateJWT(), isAdmin, getAllAdminApplications);

router.post("/check-documents/:applicationId",   authenticateJWT(), isAdmin, performTextExtraction);

router.get('/departments', authenticateJWT(),  isAdmin, getAllDepartments);

router.get('/department-applications', authenticateJWT(),  isAdmin, getDepartmentApplications);

router.get('/status-applications', authenticateJWT(),  isAdmin, getStatusApplications);

router.post("/rag/verify-context", authenticateJWT(), isAdmin, verifyContextMatch);

module.exports = router;
