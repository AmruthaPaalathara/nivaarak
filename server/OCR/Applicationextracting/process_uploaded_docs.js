// server/Applicationextracting/process_uploaded_docs.js
const { spawn } = require("child_process");
const path      = require("path");

/**
 * Extract text from a PDF by delegating to the Python helper.
 * Automatically uses “auto” mode (clean → OCR fallback).
 *
 * @param {string} pdfPath — absolute path to the PDF to process
 * @returns {Promise<{ status: 'success'|'error', text: string, found_dob?: string }>}
 */
function extractTextFromPdf(pdfPath) {
    return new Promise((resolve, reject) => {
        // Choose the appropriate python interpreter:
        const python = process.platform === "win32" ? "py" : "python3";
        const script = path.resolve(__dirname, "process_uploaded_docs.py");

        // Spawn without a shell to avoid quoting issues
        const child = spawn(python, [script, pdfPath, "auto"], {
            stdio: ["ignore", "pipe", "pipe"]
        });

        let stdout = "";
        let stderr = "";

        child.stdout.on("data", chunk => { stdout += chunk; });
        child.stderr.on("data", chunk => { stderr += chunk; });

        child.on("error", err => {
            reject(new Error(`Failed to start OCR script: ${err.message}`));
        });

        child.on("close", code => {
            if (code !== 0) {
                return reject(new Error(
                    `OCR script exited with code ${code}\n` +
                    (stderr || "No error output")
                ));
            }

            // Attempt to parse JSON
            let result;
            try {
                result = JSON.parse(stdout);
            } catch (parseErr) {
                return reject(new Error(
                    `Invalid JSON from OCR script:\n${parseErr.message}\nOutput:\n${stdout}`
                ));
            }

            // Ensure the shape is what we expect
            if (typeof result !== "object" || !("status" in result) || !("text" in result)) {
                return reject(new Error(
                    `Unexpected result shape from OCR script:\n${JSON.stringify(result)}`
                ));
            }

            resolve(result);
        });
    });
}

module.exports = { extractTextFromPdf };
