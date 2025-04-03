const axios = require("axios");

const fetchLlamaData = async (req, res, next) => {
  try {
    const prompt = `Provide the benefits and eligibility for ${req.certificateData.documentType} certificate.`;
    
    const response = await axios.post(
      "https://api.groq.com/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      },
      {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        timeout: 20000,
      }
    );

    req.llamaData = response.data.choices[0].message.content; // Store LLaMA3 response
    next();
  } catch (error) {
    console.error("LLaMA3 API Error:", error);
    res.status(500).json({ error: "Failed to fetch AI-generated content" });
  }
};

module.exports = fetchLlamaData;
