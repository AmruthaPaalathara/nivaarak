// listModels.js
require("dotenv").config();
const axios = require("axios");

(async () => {
    if (!process.env.GEMINI_API_KEY) {
        console.error("Set GEMINI_API_KEY in your .env");
        process.exit(1);
    }
    try {
        const { data } = await axios.get(
            "https://generativelanguage.googleapis.com/v1beta/models",
            { params: { key: process.env.GEMINI_API_KEY } }
        );
        console.log("Available models:");
        data.models.forEach(m => console.log(" •", m.name));
    } catch (err) {
        console.error("Error fetching models:", err.response?.data || err.message);
    }
})();
