const axios = require("axios");

const fetchLlamaData = async (req, res, next) => {
    console.log(" LLaMA middleware is running with documentType:", req.body.documentType);
    try {
        console.log("Fetching LLaMA Data...");
        console.log("Received request body:", req.body);

        // Validate documentType exists
        const documentType = req.body.documentType?.trim().toLowerCase();
        console.log("Document type:", documentType);
        if (!documentType) {
            console.error("Error: Missing 'documentType' in request.");
            return res.status(400).json({error: "Document type is required."});
        }

        const prompt = `
You are an expert document writer.
Generate detailed content for a "${documentType}" certificate.
The response **must be strictly formatted as a JSON object** with the following keys:

{
  "introduction": "A detailed introduction about the certificate.",
  "benefits": "Clearly defined benefits of obtaining the certificate.",
  "eligibility": "Step-by-step explanation of who qualifies.",
  "rejectionReasons": "List of common reasons applications get rejected.",
  "resubmissionInformation": {
    "Required Documents": [
      "Additional supporting documents, as required by the authorities",
      "Updated proof of income or employment"
    ],
    "Timelines": {
      "Resubmission period": [
        "Usually 15-30 days, dependent on authorities"
      ],
      "Reapplication fee": [
        "Varies depending on application type and authorities"
      ]
    }
  },
  "officialDocs": [
    "National ID or Passport",
    "Residential proof: utility bills, lease agreement, or property deed",
    "Proof of income: salary slip, income tax return, or employment contract"
  ]
}

 **Important:** Every section **must** contain structured, meaningful content.
If a section is empty, explain why instead of leaving it blank.
Do **not** add extra text, commentary, or explanations outside the JSON format.
`;
        console.log("Making request to LLaMA API...");
        console.log("Prompt sent:", prompt);

        console.log(" Sending Request to LLaMA3 API:", {
            model: "llama3-8b-8192",
            messages: [{role: "user", content: prompt}],
            response_format: "json_object",
            temperature: 0
        });

        const response = await axios.post(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                model: "llama3-8b-8192",
                messages: [{role: "user", content: prompt}],
                response_format: {type: "json_object"},
                temperature: 0
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                timeout: 10000
            }
        );

        console.log("LLaMA3 API Full Response:", JSON.stringify(response.data, null, 2));
        console.log("LLaMA API Response:", response.data.choices[0].message.content);

        const aiResponse = response?.data?.choices?.[0]?.message?.content;
        if (!aiResponse) {
            console.error(" AI response is missing or malformed.");
            return res.status(500).json({error: "Invalid AI response format."});
        }

        try {

            req.llamaData = JSON.parse(aiResponse);
        } catch (parseError) {
            console.error("Error parsing AI response:", parseError);
            req.llamaData = {}; // Default empty object to prevent system failure
        }
        console.log("Extracted Content:", req.llamaData);
        if (!Object.keys(req.llamaData).length) {
            console.warn("Failed to process AI-generated content; falling back to empty shape.");
            req.llamaData = {
                introduction: "",
                benefits: "",
                eligibility: "",
                rejectionReasons: "",
                resubmissionInformation: {},
                officialDocs: []
            };
        }
    } catch (err) {
        // Handle any unexpected errors or json_validate_failed
        console.error("LLaMA3 middleware error:", err.response?.data || err.message);

        // Try to rescue the 'failed_generation' blob if present
        const apiErr = err.response?.data?.error;
        if (apiErr?.code === "json_validate_failed" && apiErr.failed_generation) {
            try {
                req.llamaData = JSON.parse(apiErr.failed_generation);
                console.warn("Using failed_generation payload for llamaData");
            } catch {
                req.llamaData = {};
            }
        } else {
            req.llamaData = {
                introduction: "",
                benefits: "",
                eligibility: "",
                rejectionReasons: "",
                resubmissionInformation: {},
                officialDocs: []
            };
        }
    } finally {
        // Always proceed to next middleware/controller
        next();
    }
};
module.exports = fetchLlamaData;