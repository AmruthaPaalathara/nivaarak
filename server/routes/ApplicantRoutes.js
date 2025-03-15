const express = require("express");
const { registerApplicant, getApplicants } = require("../controllers/applicantController.js");
const router = express.Router();

// Define routes
router.post("/registration", (req, res) => {
  // Registration logic here
  res.json({ message: "Applicant registered successfully!" });
});
router.get("/applicants", (req, res) => {
  // Get applicants logic here
  res.json([]);
});

module.exports = router;