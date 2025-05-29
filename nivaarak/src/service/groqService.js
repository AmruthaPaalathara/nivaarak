const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../../nivaarak/.env")
});

const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL_NAME = "llama3-8b-8192";

async function generateContent(prompt) {
    const payload = {
        model: MODEL_NAME,
        messages: [
            {
                role: "system",
                content: "You are an expert assistant for government certificate generation.",
            },
            {
                role: "user",
                content: prompt,
            }
        ],
        temperature: 0.1,
        max_tokens: 1024,
        top_p: 0.9
    };

    try {
        const response = await axios.post(GROQ_API_URL, payload, {
            headers: {
                Authorization: `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            }
        });

        const generated = response.data?.choices?.[0]?.message?.content;
        if (!generated || typeof generated !== "string") {
            throw new Error("No text returned from Groq model");
        }

        return generated;
    } catch (err) {
        console.error("❌ Groq API error:", err?.response?.data || err.message);
        throw err;
    }
}

module.exports = { generateContent };
