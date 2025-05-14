const { exec } = require("child_process");
const path = require("path");

const extractText = (filePath) => {
    return new Promise((resolve, reject) => {
        const script = path.join(__dirname, "../../Applicationextracting/process_uploaded_docs.py");
        const command = `python "${script}" "${filePath}"`;

        exec(command, (err, stdout, stderr) => {
            if (err) {
                return reject(new Error(stderr || err.message));
            }

            try {
                const result = JSON.parse(stdout);
                resolve(result);
            } catch (parseError) {
                reject(new Error("Invalid OCR output: " + parseError.message));
            }
        });
    });
};

module.exports = extractText;
