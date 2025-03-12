const ollama = require("ollama").default; //  Correct Import

// Function to interact with LLaMA 3 based on user input
async function askLlama(prompt) {
    try {
        console.log(" Sending request to LLaMA 3:", prompt);

        const response = await ollama.chat({
            model: "llama3:latest",
            messages: [{ role: "user", content: prompt }],
            stream: false, // Regular API call, not streaming
        });

        console.log(" LLaMA 3 Response:", response.message.content);
        return response.message.content;
    } catch (error) {
        console.error(" Error with LLaMA 3:", error);
        return "Sorry, I couldn't process your request.";
    }
}

module.exports = { askLlama };
