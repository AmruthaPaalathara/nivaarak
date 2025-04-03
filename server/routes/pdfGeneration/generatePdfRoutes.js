const express = require("express");
const pdfController = require("../../controllers/pdf/generatePdfController.js");
const fetchLlamaData = require("../../middleware/pdfGenerator/llama3Middleware.js");
const { authenticateJWT, authenticateSession } = require("../../middleware/authenticationMiddleware/authMiddleware.js");
const errorHandler = require("../../middleware/errorHandler.js");

const router = express.Router();

//  Authentication Middleware
// const authMiddleware = (req, res, next) => {
//   if (req.headers.authorization) {
//     return authenticateJWT(req, res, next);
//   }
//   return authenticateSession(req, res, next);
// };

// 🔹 Generate PDF Route (with authentication and data fetching)
router.get(
  "/generate-pdf/:id",

  fetchLlamaData,
  pdfController.generatePDF
);

// 🔹 Error Handling Middleware
router.use(errorHandler);

module.exports = router;