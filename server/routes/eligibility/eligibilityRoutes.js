const express = require("express");
const router = express.Router();
const multer = require("multer");
const { verifyEligibility } = require("../../controllers/Eligibility/eligibilityController");
const { isAdmin } = require("../../middleware/rbac");

const upload = multer({ dest: "uploads/" });

router.post("/verify", isAdmin, upload.array("documents"), verifyEligibility);

module.exports = router;
