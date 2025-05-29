// server/middleware/pdfGenerator/groqPdfMiddleware.js
require('dotenv').config();
const { generateContent } = require('../../../nivaarak/src/service/groqService');

/**
 * Middleware to generate structured PDF content for a given certificate type using Hugging Face models.
 * Attaches the parsed JSON to req.pdfContent for later PDF generation.
 */
module.exports = async function fetchPdfContent(req, res, next) {
    const { documentType } = req.body;
    console.log('🖨 PDF Content Middleware:', documentType);

    if (!documentType || !documentType.trim()) {
        console.error('Error: Missing or empty documentType in request.');
        return res.status(400).json({ error: 'documentType is required.' });
    }

    const prompt = `
You are a government document expert specializing in Indian administrative processes, especially for the Maharashtra state government.

Generate the following structured certificate content for "${documentType}" certificate issued by the Maharashtra Government.

Respond ONLY with valid JSON. Do not include explanations or commentary. Use Maharashtra-specific schemes, benefits, and eligibility.

Format:

{
  "introduction": "...",
  "benefits": "...",
  "eligibility": "...",
  "rejectionReasons": "...",
  "resubmissionInformation": {
    "Required Documents": ["..."],
    "Timelines": {
      "Resubmission period": ["..."],
      "Reapplication fee": ["..."]
    }
  },
  "officialDocs": ["..."]
}
`;



    try {
        const aiRaw = await generateContent(prompt);
        console.log("📦 Raw AI Response before:\n", aiRaw);

        const match = aiRaw.match(/```json\s*([\s\S]*?)```/);
        const jsonString = match ? match[1] : aiRaw;
        let parsed;
        try {
            parsed = JSON.parse(jsonString);
        } catch (jsonErr) {
            console.warn("⚠️ Strict JSON parsing failed, attempting relaxed fix...");

            // Fix common issues: trailing commas, unescaped quotes
            const cleaned = jsonString
                .replace(/,\s*}/g, "}")
                .replace(/,\s*]/g, "]")
                .replace(/\\n/g, "\n")
                .replace(/\\"/g, '"');

            try {
                parsed = JSON.parse(cleaned);
            } catch (finalErr) {
                console.error("❌ Final JSON parse failed. AI returned badly formatted content.");
                console.error("Raw:\n", jsonString);
                throw new Error("AI did not return valid JSON");
            }
        }

// 🔁 Use rejectionReasons from RAG + LLaMA if provided
        const rejectionReasonsFromRAG = req.body.rejectionReasons;

// 🧱 Final structure with fallback
        req.pdfContent = {
            introduction: parsed.introduction || "",
            benefits: parsed.benefits || "",
            eligibility: parsed.eligibility || "",
            rejectionReasons: rejectionReasonsFromRAG || parsed.rejectionReasons || "",
            resubmissionInformation: parsed.resubmissionInformation || {},
            officialDocs: parsed.officialDocs || []
        };

    } catch (err) {
        console.error('📄 PDF Content gen error:', err);

        req.pdfContent = {
            introduction: "",
            benefits: "",
            eligibility: "",
            rejectionReasons: req.body.rejectionReasons || parsed.rejectionReasons || "",
            resubmissionInformation: {},
            officialDocs: []
        };
    }

    next();
};
