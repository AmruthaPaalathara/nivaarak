const express = require("express");
const pdfController = require("../../controllers/pdf/generatePdfController.js");
const fetchLlamaData = require("../../middleware/pdfGenerator/llama3Middleware.js");
const { authenticateJWT, authenticateSession } = require("../../middleware/authenticationMiddleware/authMiddleware.js");
const errorHandler = require("../../middleware/errorHandler.js");
const { isAdmin } = require("../../middleware/rbac");

const router = express.Router();

//  Authentication Middleware
const authMiddleware = (req, res, next) => {
    if (req.headers.authorization) {
        return authenticateJWT(req, res, next);
    }
    return authenticateSession(req, res, next);
};

router.post(
    "/generate-pdf",
    authenticateJWT(),
    isAdmin , // or your auth middleware
    fetchLlamaData,         // ← run the AI prompt first
    async (req, res) => {
        await pdfController.generatePDF(req, res);
    }
);


// Error Handling Middleware
router.use(errorHandler);

module.exports = router;
