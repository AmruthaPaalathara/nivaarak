const express = require("express");
const pdfController = require("../../controllers/pdf/generatePdfController.js");
const getAiData     = require("../../middleware/pdfGenerator/groqPdfMiddleware");
const { authenticateJWT, authenticateSession } = require("../../middleware/authenticationMiddleware/authMiddleware.js");
const errorHandler = require("../../middleware/errorHandler.js");
const { isAdmin } = require("../../middleware/rbac");
const fetchPdfContent = require("../../middleware/pdfGenerator/groqPdfMiddleware");

const router = express.Router();

//  Authentication Middleware
const authMiddleware = (req, res, next) => {
    if (req.headers.authorization) {
        return authenticateJWT(req, res, next);
    }
    return authenticateSession(req, res, next);
};

router.post("/fetch-content", authenticateJWT(), async (req, res) => {
    try {
        const documentType = req.body.documentType;

        // 🔁 Use your middleware as a function to extract content dynamically
        req.body = { documentType }; // ensure req.body is populated
        await fetchPdfContent(req, res, () => {
            return res.json({ success: true, pdfContent: req.pdfContent });
        });
    } catch (err) {
        console.error("Dynamic PDF content generation failed:", err);
        res.status(500).json({ success: false, error: "Failed to fetch dynamic PDF content" });
    }
});


router.post(
    "/generate-pdf",
    authenticateJWT(),      // or authMiddleware
    isAdmin,
    getAiData,
    (req, res, next) => {
        pdfController.generatePDF(req, res).catch(next);
    }
);

// Error Handling Middleware
router.use(errorHandler);

module.exports = router;
