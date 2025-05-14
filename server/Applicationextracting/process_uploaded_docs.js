const { spawn } = require("child_process");
const path      = require("path");

/**
 * Run your Python helper in "upload" mode.
 * @param {string} pdfPath - absolute path to the PDF
 * @returns {Promise<{status:string,text:string,metadata?:object}>}
 */
function extractTextFromPdf(pdfPath) {
    return new Promise((resolve, reject) => {
        // pick a Python command that actually exists on the system
        const python = process.platform === "win32" ? "py" : "python3";
        const script = path.resolve(__dirname, "process_uploaded_docs.py");

        // spawn avoids shell‐escaping headaches
        const py = spawn(python, [script, pdfPath], { stdio: ["ignore","pipe","pipe"] });
        let out = "", err = "";

        py.stdout.on("data", d => out += d);
        py.stderr.on("data", d => err += d);

        py.on("close", code => {
            if (code !== 0) {
                return reject(new Error(`OCR script failed (code ${code}):\n${err}`));
            }
            try {
                const result = JSON.parse(out);
                resolve(result);
            } catch (e) {
                reject(new Error(`Invalid JSON from OCR script:\n${out}`));
            }
        });
    });
}

module.exports = { extractTextFromPdf };
