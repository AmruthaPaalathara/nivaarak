const express = require("express");
const router = express.Router();

const { authenticateJWT, authenticateSession, } = require("../../middleware/authenticationMiddleware/authMiddleware");
const { getUserApplicationTableData } = require("../../controllers/adminDashboard/userDashboardController")

router.get("/user-applications-table", authenticateJWT(), getUserApplicationTableData);
console.log("getUserApplicationTableData is hitting in userTableRouter");

module.exports = router;