const axios = require("axios");
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama3-70b-8192";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function compareTextWithLlama(fullPrompt) {
    const payload = {
        model: MODEL_NAME,
        messages: [
            {
                role: "system",
                content: "You are an eligibility verifier. Read the provided submitted application details and the extracted document text. Identify any missing or mismatched fields. Be concise and clear.",
            },
            {
                role: "user",
                content: fullPrompt,
            },
        ],
        temperature: 0.1,
        max_tokens: 512,
    };

    const headers = {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
    };

    try {
        const response = await axios.post(GROQ_API_URL, payload, { headers });
        return response.data.choices[0].message.content.trim();
    } catch (error) {
        console.error("❌ Groq API call failed:", error.response?.data || error.message);
        return "AI verification failed. Please check the document manually.";
    }
}

module.exports = compareTextWithLlama;
