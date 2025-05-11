// server/extracting/process_uploaded_docs.js
const { exec } = require("child_process");
const path      = require("path");

module.exports.extractTextFromPdf = (pdfPath) => {
    return new Promise((resolve, reject) => {
        const script = path.join(__dirname, "process_uploaded_docs.py");
        // Use python3 if that’s your interpreter
        const cmd    = `python3 "${script}" "${pdfPath}"`;

        exec(cmd, { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(stderr || err.message));
            }
            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (parseErr) {
                reject(new Error("Failed to parse OCR output: " + parseErr.message));
            }
        });
    });
};
