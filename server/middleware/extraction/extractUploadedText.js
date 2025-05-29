const { exec } = require("child_process");
const path = require("path");
const expectedFields = require("../../utils/documentFieldMap");

const extractText = (filePath, documentType) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(
            __dirname, "..", "..", "OCR", "Applicationextracting", "process_uploaded_docs.py"
        );

        const command = `python "${scriptPath}" "${filePath}" auto`;
        console.log("🔍 Running OCR command:", command);

        exec(command, (err, stdout, stderr) => {
            if (err) {
                console.error("❌ Text extraction failed:", err);
                console.error("Python stderr:", stderr);
                return reject(err);
            }

            try {
                const result = JSON.parse(stdout); // should contain { text: '...' }
                const fullText = result.text || "";

                // ↓ Extract required fields for this document type
                const wantedFields = expectedFields[documentType] || [];
                const extractedDetails = {};

                for (const field of wantedFields) {
                    const match = new RegExp(`${field}\\s*[:\\-]?\\s*(.*)`, "i").exec(fullText);
                    extractedDetails[field] = match ? match[1].split("\n")[0].trim() : "";
                }

                resolve({ fullText, extractedDetails });

            } catch (parseError) {
                reject(new Error("Invalid OCR output: " + parseError.message));
            }
        });
    });
};

module.exports = extractText;
