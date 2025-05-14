// server/utils/verifyRules.js
const docRules = require("../data/documentData.json");
const { calculateAge } = require("./ageUtils");

function verifyAgainstRules(extractedText, documentType, extraData = {}) {
    const rules = docRules[documentType];

    const text = Array.isArray(extractedText)
        ? extractedText.join(" ")
        : typeof extractedText === "string"
    ? extractedText
            : "";

    const mismatches = [];

    // 1️⃣ Check each required_documents item
    for (const req of rules.required_documents) {
        if (!text.includes(req)) {
            mismatches.push(`Missing required: ${req}`);
        }
    }

    // 2️⃣ Check each proof-array
    for (const [key, examples] of Object.entries(rules)) {
        if (key === "required_documents") continue;
        if (Array.isArray(examples)) {
            const foundAny = examples.some(ex => extractedText.includes(ex));
            if (!foundAny) mismatches.push(`No ${key.replace("_", " ")} found`);
        }
    }

    // 3️⃣ Special case: Senior Citizen
    if (documentType === "Senior Citizen Certificate" && extraData.dob) {
        const age = calculateAge(extraData.dob);
        if (age === null || age < 60) {
            mismatches.push(`Age ${age ?? "unknown"} ⬅️ must be ≥ 60`);
        }
    }

    return { eligible: mismatches.length === 0, mismatchReasons: mismatches };
}

module.exports = { verifyAgainstRules };
