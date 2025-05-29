// server/utils/callAIService.js
require("dotenv").config();
const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama-3.3-70b-versatile"; // Confirmed available Groq model

/**
 * Generates a Groq LLM response with multi-turn memory + optional doc context
 * @param {Object} options
 * @param {string} options.userQuery - Latest user message
 * @param {Array<{ role: string, content: string }>} options.history - Previous messages
 * @param {string} [options.docContext] - Extracted text or relevant snippet
 * @returns {Promise<string>} - Cleaned AI response
 */
const callAIService = async ({ userQuery, history = [], docContext = "" }) => {
    try {
        console.log(" Incoming userQuery:", userQuery);
        if (!userQuery || typeof userQuery !== "string") {
            throw new Error("Invalid user query");
        }

        // Clean and format history
        const cleanedHistory = history
            .filter(m => m && m.role && typeof m.content === "string" && m.content.trim().length > 0)
            .map(m => ({
                role: m.role === "ai" ? "assistant" : m.role,  // 🔁 map "ai" to "assistant"
                content: m.content.trim()
            }))
            .slice(-8);

        // Build messages array
        const messages = [
            {
                role: "system",
                content:
                    "You are a helpful assistant for answering queries related to all types of government-issued certificates and documents from Maharashtra.\n" +
                    "Answer in clear, simple English. Always prioritize relevance to Maharashtra's official schemes, services, and legal frameworks.\n" +
                    "If a document context is available, use it. Otherwise, answer generally based on common knowledge of Maharashtra government documentation.\n" +
                    "Do not mention foreign countries or irrelevant entities."
            },
            ...(docContext && typeof docContext === "string" && docContext.trim().length > 10
                ? [{ role: "system", content: `Relevant Document Context:\n${docContext.slice(0, 1000)}` }]
                : []),
            ...cleanedHistory,
            { role: "user", content: userQuery.trim() }
        ];

        // Send request to Groq
        const response = await axios.post(
            GROQ_API_URL,
            {
                model: MODEL_NAME,
                messages,
                temperature: 0.1,
                max_tokens: 512 //  Use correct key: max_tokens
            },
            {
                headers: {
                    Authorization: `Bearer ${GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 60000
            }
        );

        // Parse and clean response
        const reply = response.data.choices?.[0]?.message?.content?.trim();
        if (!reply) throw new Error("No response from model");

        return cleanResponse(reply);
    } catch (err) {
        console.error("💥 Groq API ERROR", {
            error: err.response?.data || err.message,
            prompt: userQuery,
            docLen: docContext?.length || 0,
            histLen: history?.length || 0
        });

        return "Sorry, I couldn't process your request right now. Please try again later.";
    }
};

/**
 * Cleanup helper to remove hallucinated headers, extra symbols, etc.
 * @param {string} text
 * @returns {string}
 */
function cleanResponse(text) {
    return text
        .replace(/^(Answer:|Response:|AI:)/i, "")
        .replace(/^\n+|\n+$/g, "")
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\s{3,}/g, "  ")
        .trim();
}


module.exports = { callAIService };
