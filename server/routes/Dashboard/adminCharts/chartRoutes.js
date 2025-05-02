const express = require('express');
const router = express.Router();
const { getStatusStats, getAdminApplicationChartStats} = require('../../../controllers/adminDashboard/charts/adminChartController');
const { authenticateJWT } = require('../../../middleware/authenticationMiddleware/authMiddleware');
const { isAdmin } = require("../../../middleware/rbac");

router.get("/", (req, res) => res.json({ success: true, message: "Admin Dashboard API is working!" }));
router.get('/status-stats',  authenticateJWT(), isAdmin, getStatusStats);
router.get("/admin-applications", authenticateJWT(), isAdmin, getAdminApplicationChartStats);


module.exports = router;
