const axios = require("axios");

const GROQ_API_KEY = process.env.GROQ_API_KEY; // Store your Groq API key in environment variables
const GROQ_API_URL = "https://api.groq.com/v1/chat/completions";

/**
 * Get AI response from Groq API
 * @param {string} message - User's message
 * @param {string} documentId - Optional document ID for context
 * @returns {string} - AI response
 */
const getAIResponse = async (message, documentId = null) => {
  try {
    const response = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-8b-8192", // Use the appropriate model
        messages: [
          {
            role: "user",
            content: message,
          },
        ],
        context: documentId ? { documentId } : null, // Optional context from document
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.choices[0].message.content; // Extract AI response
  } catch (error) {
    console.error("Groq API Error:", error.response ? error.response.data : error.message);
    throw new Error("Failed to get AI response");
  }
};

module.exports = { getAIResponse };