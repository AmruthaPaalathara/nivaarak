
const { GoogleGenerativeAI, GoogleGenerativeAIFetchError } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "text-bison-001",
});

async function generateContent(prompt) {
    try {
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [
                        { text: prompt }
                    ],
                },
            ],
        });
        const response = await result.response;

        if (
            !response?.candidates?.length ||
            !response.candidates[0].content
        ) {
            let reason = response?.candidates?.[0]?.finishReason
                || response?.promptFeedback?.blockReason
                || "unknown";
            throw new Error("No content: " + reason);
        }

        return response.candidates[0].content;
    } catch (err) {
        if (err instanceof GoogleGenerativeAIFetchError) {
            console.error("Gemini fetch error:", err);
        } else {
            console.error("Gemini error:", err);
        }
        throw err;
    }
}

module.exports = { generateContent };
