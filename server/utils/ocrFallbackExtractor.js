const { exec } = require("child_process");
const path = require("path");

const extractTextWithOCR = (pdfPath) => {
    return new Promise((resolve, reject) => {
        const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";
        const scriptPath = path.resolve(__dirname, "../../extracting/process_pdf.py");

        const command = `${PYTHON_CMD} "${scriptPath}" "${pdfPath}"`;

        console.log("🔁 Running fallback OCR extraction:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ OCR extraction failed:", stderr || error.message);
                return reject(new Error(stderr || "OCR extraction failed"));
            }
            try {
                const result = JSON.parse(stdout);
                if (result.status === "success" && typeof result.text === "string") {
                    resolve(result);
                } else {
                    reject(new Error("Invalid OCR output format"));
                }
            } catch (parseError) {
                reject(new Error("Failed to parse OCR extraction results"));
            }
        });
    });
};

module.exports = { extractTextWithOCR };
