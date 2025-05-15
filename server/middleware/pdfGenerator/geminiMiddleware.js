const axios = require("axios");

const fetchLlamaData = async (req, res, next) => {
    console.log("MT5 middleware running; docType=", req.body.documentType);
    try {
        console.log("Fetching MT5 Data...");
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
Do **not** add extra text, commentary, or explanations outside the JSON format. Also Do **not** add chat metadata—return ONLY the JSON object.
`;
        console.log("Making request to MT5 API...");
        console.log("Prompt sent:", prompt);

        console.log(" Sending Request to LLaMA3 API:", {
            model: "MT5",
            messages: [{role: "user", content: prompt}],
            response_format: "json_object",
            temperature: 0
        });

        const response = await axios.post(
            "https://api-inference.huggingface.co/models/google/mt5-base",
            { inputs: prompt},
            {
                headers: {
                    Authorization: `Bearer ${process.env.HF_TOKEN}`,
                    "Content-Type": "application/json"
                },
                timeout: 20000
            }
        );

        console.log("LLaMA3 API Full Response:", JSON.stringify(response.data, null, 2));
        console.log("LLaMA API Response:", response.data.choices[0].message.content);

        const generated = response.data?.[0]?.generated_text;
        if (!generated) {
            console.error("Empty HF response:", response.data);
            req.llamaData = {};
            return next();
        }

        // Parse out just the JSON object from the raw generated text:
        const jsonMatch = generated.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn("Could not extract JSON from MT5 output:", generated);
            req.llamaData = {};
            return next();
        }

        try {
            req.llamaData = JSON.parse(jsonMatch[0]);
        } catch (e) {
            console.error("JSON parse error:", e, "\nRaw text:", jsonMatch[0]);
            req.llamaData = {};
        }

    } catch (err) {
        console.error("MT5 inference error:", err.response?.data || err.message);
        req.llamaData = {};
    } finally {
        next();
    }
};

module.exports = fetchLlamaData;