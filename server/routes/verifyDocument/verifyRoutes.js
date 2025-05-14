const express = require("express");
const router = express.Router();
const { checkApplication } = require("../../controllers/verification/verificationController");
const { authenticateJWT } = require("../../middleware/authenticationMiddleware/authMiddleware");
const { isAdmin } = require("../../middleware/rbac");

router.post("/applications/:id/check", authenticateJWT(), isAdmin, checkApplication);

module.exports = router;
