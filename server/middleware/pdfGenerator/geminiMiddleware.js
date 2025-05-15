require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error('Missing GEMINI_API_KEY');

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'text-bison-001' });

async function fetchGeminiData(req, res, next) {
    console.log("☁️  Gemini middleware start:", req.body.documentType);

    const docType = (req.body.documentType || '').trim();
    if (!docType) return res.status(400).json({ error: 'Missing documentType' });

    const prompt = `You are a document‐eligibility assistant.  
Given the certificate type and applicant details, output JSON with keys “eligibility” (array of strings) and “benefits” (array of strings).  
Do not include any other keys or prose.`

    try {
        const result   = await model.generateContent(prompt);
        const response = await result.response;
        const rawText  = response.text();
        console.log("☁️  Gemini raw response:", rawText);
        const json     = JSON.parse(rawText);
        console.log("☁️  Gemini parsed JSON:", json);

        req.geminiData = json;
    } catch (err) {
        console.error('Gemini error:', err);
        // fallback empty shape
        req.geminiData = {
            introduction: '',
            benefits: '',
            eligibility: '',
            rejectionReasons: '',
            resubmissionInformation: {},
            officialDocs: []
        };
    }
    next();
}

module.exports = fetchGeminiData;
