
const { exec } = require("child_process");
const path     = require("path");

/**
 * Runs a Python-based fallback OCR extraction on a PDF file.
 * Uses 'py -3' on Windows or 'python3' on Unix-like systems.
 *
 * @param {string} pdfPath - Absolute path to the PDF file.
 * @returns {Promise<{status: string, text: string}>}
 */
const extractTextWithOCR = (pdfPath) => {
    return new Promise((resolve, reject) => {
        const isWin       = process.platform === "win32";
        const PYTHON_CMD = isWin ? "python" : "python3";
        const PYTHON_FLAG = isWin ? "-3"       : null;

        // Resolve the Python script path
        const scriptPath = path.resolve(__dirname, "../OCR/Applicationextracting/process_pdf.py");
        const cmdline = `"${scriptPath}" "${pdfPath}"`;

        console.log("🔁 Running fallback OCR extraction:", PYTHON_CMD, cmdline);

        // Build command arguments
        const args = [];
        if (PYTHON_FLAG) args.push(PYTHON_FLAG);
        args.push(scriptPath, pdfPath);

        console.log("🔁 Running fallback OCR extraction:", PYTHON_CMD, cmdline);
        exec(`${PYTHON_CMD} ${cmdline}`, (error, stdout, stderr) => {
            if (error) {
                console.error("❌ OCR extraction failed:", stderr || error.message);
                return reject(new Error(stderr || "OCR extraction failed"));
            }
            console.log(`✅ OCR extraction success: ${stdout.trim().slice(0, 100)}...`);

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
