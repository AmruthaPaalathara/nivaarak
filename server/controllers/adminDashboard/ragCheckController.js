const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const compareTextWithLlama = require("../../utils/groqCompare");
const Certificate = require("../../models/application/certificateApplicationSchema");
const extractText = require("../../middleware/extraction/extractUploadedText");

exports.verifyContextMatch = async (req, res) => {
    const { userQuery, applicationId } = req.body;

    try {
        if (!applicationId || !userQuery) {
            return res.status(400).json({ success: false, error: "Missing applicationId or userQuery." });
        }

        // Step 1: Rebuild rules index if not found
        const rulesIndexPath = path.resolve("server/ml/faiss_index/rules.index");
        const pythonCmd = process.platform === "win32" ? "python" : "python3";
        const buildScript = path.join(__dirname, "..", "..", "ml", "verification", "indexing", "build_faiss_with_rules.py");

        if (!fs.existsSync(rulesIndexPath)) {
            console.log(" rules.index not found. Building it now...");
            execSync(`${pythonCmd} "${buildScript}"`);
            console.log(" rules.index built.");
        }

        // Step 2: Run RAG
        const ragScript = path.join(__dirname, "..", "..", "ml", "verification", "model", "ragVerifier.py");
        const output = execSync(`${pythonCmd} "${ragScript}" "${userQuery}"`).toString();
        const result = JSON.parse(output);

        // Step 3: Load application
        const app = await Certificate.findById(applicationId);
        if (!app) {
            return res.status(404).json({ success: false, error: "Application not found." });
        }

        // Step 4: Extract if not present
        let extractedText = app.extractedText?.trim();
        if (!extractedText) {
            const filePath = app.flatFiles?.[0];
            if (!filePath) {
                return res.status(400).json({ success: false, error: "No document found to extract text from." });
            }

            const fullPath = path.join(__dirname, "..", "..", "uploads", "applications", filePath);

            // ✅ OCR + structured extraction
            const { fullText, extractedDetails } = await extractText(fullPath, app.documentType);
            if (!fullText) {
                return res.status(400).json({ success: false, error: "OCR did not return valid text." });
            }

            app.extractedText = fullText;
            app.extractedDetails = new Map(Object.entries(extractedDetails || {})); //  Convert to Map
            await app.save();

            extractedText = fullText;
        }

        console.log("✅ Extracted details map:", app.extractedDetails);


        // Step 5: Prepare prompt
        const detailsObj = Object.fromEntries(app.extractedDetails || []);
        const reason = detailsObj.rejectionReason || "No rejection reason provided.";

        console.log("Converted Object: ", detailsObj)

        const hasAadharInExtraction = !!detailsObj.aadhar;

        function normalizeValue(value = "") {
            return value
                .toString()
                .toLowerCase()
                .normalize("NFKD")               // handles accented characters
                .replace(/[\s\-_]/g, "")         // remove spaces, dashes, underscores
                .replace(/[^\w]/g, "")           // remove all punctuation
                .trim();
        }

        const submittedDetails = {
            first_name: normalizeValue(app.firstName),
            last_name: normalizeValue(app.lastName),
            dob: normalizeValue(app.dob || detailsObj.dob),
            aadhar: hasAadharInExtraction ? normalizeValue(detailsObj.aadhar) : undefined,
            address: normalizeValue(app.address || detailsObj.address),
            phone: normalizeValue(app.phone || detailsObj.phone),
            email: normalizeValue(app.email),
        };
        console.log("🧪 app.aadharNumber:", app.aadharNumber);
        console.log("🧪 detailsObj.aadhar:", detailsObj.aadhar);

        console.log("📄 Details passed to LLaMA:", submittedDetails);

        const llmPrompt = `
You are a village officer verifying a certificate application.

Your tasks:
1. Identify any **mismatches** between the submitted application details and the extracted text from the uploaded document.
2. Check **eligibility** for the document type based on typical government rules.
3. Conclude with: "Eligible" or "Not Eligible" and explain why.

Document Type: ${app.documentType}

Submitted Application:
${JSON.stringify(submittedDetails, null, 2)}

Extracted Text:
${extractedText}

Reply with a short bullet list of mismatched or missing fields along with reasons for rejections and explain each clearly.
`;

        // Step 6: Ask Groq (LLaMA)
        const aiReply = await compareTextWithLlama(llmPrompt);
        app.extractedDetails.set("rejectionReason", aiReply);
        await app.save();

        return res.json({
            success: true,
            aiResponse: aiReply
        });

    } catch (err) {
        console.error(" Error verifying context:", err);
        return res.status(500).json({ success: false, error: "Context verification failed." });
    }
};
