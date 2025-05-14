const { spawn } = require('child_process');
const path      = require('path');

/**
 * Spawns the OCR Python script with a given mode.
 * Modes:
 *  - 'digit' for digit-only (e.g. Aadhaar)
 *  - 'raw'   for full raw text
 *  - 'alpha' for alphanumeric (e.g. PAN, names)
 */

function runOcrMode(pdfPath, mode, dpi = '500', threshold = '100', median = '1') {
    return new Promise((resolve, reject) => {
        const script = path.join(__dirname, '../VerificationExtraction/ocr_text.py');
        const py = spawn('python', [ script, pdfPath, mode, dpi, threshold, median ]);

        let out = '';
        py.stdout.on('data', d => out += d.toString());
        py.stderr.on('data', d => console.error('OCR stderr:', d.toString()));

        py.on('close', code => {
            if (mode === 'digit') {
                // look for our custom marker in the Python output
                const m = out.match(/DETECTED_DIGITS:(\d{12})/);
                if (m) return resolve(m[1]);
                return reject(new Error('No 12-digit string found'));
            }

            if (mode === 'alpha') {
                // look for our custom marker for alphanumeric
                // e.g. in Python you might print: DETECTED_ALPHA:ABCDE1234F
                const m = out.match(/DETECTED_ALPHA:([A-Z0-9]+)/);
                if (m) return resolve(m[1]);
                return reject(new Error('No alphanumeric token found'));
            }

            // 'raw' mode: return entire OCR text
            return resolve(out);
        });
    });
}

exports.runOcrDigits         = pdfPath => runOcrMode(pdfPath, 'digit');
exports.runOcrFullText       = pdfPath => runOcrMode(pdfPath, 'raw');
exports.runOcrAlphanumeric  = pdfPath => runOcrMode(pdfPath, 'alpha');