const express = require("express");
const router = express.Router();
const { getUserApplicationStats } = require("../../../controllers/userDashboard/charts/userChartController");
const { authenticateJWT } = require("../../../middleware/authenticationMiddleware/authMiddleware");

router.get("/user-applications", authenticateJWT(), getUserApplicationStats)

module.exports = router;