const express = require("express");
const { registerApplicant, getApplicants } = require("../controllers/applicantController.js");
const router = express.Router();

router.post("/registration", registerApplicant);
router.get("/applicants", getApplicants);

module.exports = router;
