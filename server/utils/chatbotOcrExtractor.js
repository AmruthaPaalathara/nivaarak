// server/utils/ocrFallbackExtractor.js
const { exec } = require("child_process");
const path     = require("path");

function extractTextWithOCR(pdfPath) {
    return new Promise((resolve, reject) => {
        const scriptPath = path.resolve(
            __dirname,
            "../OCR/chatbotExtraction/process_chatbot_fallback.py"
        );
        // Use the proper Python command on Windows vs Unix
        const pyCmd = process.platform === "win32" ? "python" : "python3";

        exec(
            `${pyCmd} "${scriptPath}" "${pdfPath}"`,
            (err, stdout, stderr) => {
                if (err) {
                    console.error("❌ OCR extraction failed:", stderr || err.message);
                    return reject(new Error(stderr || err.message));
                }
                // Do NOT JSON.parse here—stdout IS the text
                const text = stdout.trim();
                console.log(`✅ OCR extraction success (len=${text.length})`);
                resolve({ status: "success", text });
            }
        );
    });
}

module.exports = { extractTextWithOCR };
