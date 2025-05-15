// getAiData.js
const { generateContent } = require("../../../nivaarak/src/service/geminiServices");
const Citizen      = require("../../models/citizenDetails/citizenSchema");
const DocumentRule = require("../../models/verification/DocumentRule");

module.exports = async function getAiData(req, res, next) {
    const { userId, documentType } = req.body;
    try {
        // Fetch citizen & rule early so you can include details in your prompt
        const citizen = await Citizen.findOne({ userId });
        const rule    = await DocumentRule.findOne({ docType: documentType });
        const docsList = rule?.requiredDocs?.get("required_documents") || [];

        // Build a JSON‐forcing prompt
        const prompt = `
You are a smart assistant that drafts:
1. A one‐paragraph introduction
2. A list of benefits
3. A list of eligibility criteria

Input:
  documentType: "${documentType}"
  applicantAge: ${citizen?.age || "unknown"}
  requiredDocuments: ${JSON.stringify(docsList)}

Output _only_ valid JSON, e.g.:
{
  "introduction": "…",
  "benefits": ["…","…"],
  "eligibility": ["…","…"]
}
`;

        const jsonString = await generateContent(prompt);
        req.geminiData = JSON.parse(jsonString);
    } catch (err) {
        console.error("⚠️ AI data fetch failed, falling back:", err);
        req.geminiData = {};
    }
    next();
};
