const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const Document = require("../../models/documentSchema");
const logger = require("../../utils/logger.js");

// Configuration Constants
const MAX_PDF_SIZE = parseInt(process.env.MAX_PDF_SIZE) || 5 * 1024 * 1024; // 5MB
const PROCESS_TIMEOUT = parseInt(process.env.PROCESS_TIMEOUT) || 30000; // 30 seconds
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  logger.error("GROQ_API_KEY is missing! Document processing may fail.");
}

/**
 * Process uploaded PDF file.
 */
exports.processPdf = async (pdfFile) => {
  const startTime = Date.now();

  try {
    if (!pdfFile || !pdfFile.path) throw new Error("PDF file not provided");
    if (!fs.existsSync(pdfFile.path)) throw new Error("PDF file not found on server");
    if (pdfFile.size > MAX_PDF_SIZE) throw new Error(`PDF size exceeds ${MAX_PDF_SIZE / 1024 / 1024}MB limit`);

    // ✅ Extract text from PDF
    const extractionResult = await executePythonProcessor(pdfFile.path);
    logger.info(`PDF Text Extracted: ${extractionResult.text.substring(0, 100)}...`); // Log first 100 chars

    // ✅ Analyze document content using Groq API
    const analysisResult = await analyzeMaharashtraDocument(extractionResult.text);
    logger.info(`Document Analysis Result: ${JSON.stringify(analysisResult)}`);

    // ✅ Validate extracted data
    const validatedData = validateMaharashtraDocument(analysisResult);

    // ✅ Store document in the database
    const doc = await createDocumentRecord(pdfFile, extractionResult, validatedData, startTime);

    return {
      status: "success",
      documentId: doc._id,
      metadata: doc.metadata,
      analysis: doc.analysis,
    };

  } catch (error) {
    logger.error("Document Processing Error:", error);
    return {
      status: "error",
      message: error.message,
    };
  } finally {
    cleanupFile(pdfFile.path);
  }
};

/**
 * Run Python script for PDF processing.
 */
const executePythonProcessor = (filePath) => {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, "../../process_pdf.py");
    const process = spawn("python3", [pythonScript, filePath]);

    let output = "";
    let errorOutput = "";

    process.stdout.on("data", (data) => {
      output += data.toString();
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Python script failed: ${errorOutput || "Unknown error"}`));
        return;
      }

      try {
        const parsedOutput = JSON.parse(output);
        if (parsedOutput.status === "success") {
          resolve(parsedOutput);
        } else {
          reject(new Error(parsedOutput.message || "PDF processing error"));
        }
      } catch (e) {
        reject(new Error("Invalid processor response format"));
      }
    });

    setTimeout(() => {
      process.kill();
      reject(new Error("PDF processing timed out"));
    }, PROCESS_TIMEOUT);
  });
};

/**
 * Analyze document content using Groq API.
 */
const analyzeMaharashtraDocument = async (text) => {
  try {
    if (!text || text.trim().length < 100) throw new Error("Insufficient text content for analysis");

    const prompt = `Analyze this Maharashtra government document and extract:
1. Document type (Birth Certificate, Caste Certificate, Income Certificate, etc.)
2. Issuing authority (e.g., Mumbai Municipal Corporation, Pune District Office)
3. Key fields (Name in Marathi/English, Date of Issue, Certificate Number, etc.)
4. Validity period (if mentioned)
5. Language of document (Marathi/English)

Return JSON format with marathiText and englishText fields for bilingual content.

Document Content:
${sanitizeText(text.substring(0, 3000))}`; // Limit text to first 3000 chars

    const response = await axios.post(
      "https://api.groq.com/v1/chat/completions",
      {
        model: "llama3-8b-8192",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
        timeout: 20000,
      }
    );

    return parseAnalysisResponse(response);

  } catch (error) {
    logger.error("Analysis Error:", error);
    throw new Error(`Document analysis failed: ${error.message}`);
  }
};

/**
 * Parse and validate response from Groq API.
 */
const parseAnalysisResponse = (response) => {
  try {
    const rawContent = response.data.choices[0].message.content;
    const parsedData = JSON.parse(rawContent);

    if (!parsedData.documentType || !parsedData.issuingAuthority) {
      throw new Error("Invalid document analysis format");
    }

    return parsedData;
  } catch (error) {
    logger.error("Analysis Parsing Error:", error);
    throw new Error("Failed to parse analysis results");
  }
};

/**
 * Save document details in MongoDB.
 */
const createDocumentRecord = async (pdfFile, extractionResult, analysis, startTime) => {
  const doc = new Document({
    originalName: pdfFile.originalname,
    extractedText: extractionResult.text,
    analysis,
    metadata: {
      state: "Maharashtra",
      documentType: analysis.documentType,
      language: analysis.language || "Marathi",
      pages: extractionResult.metadata?.pages || 0,
      fileSize: pdfFile.size,
      processingTime: Date.now() - startTime, // ✅ Correct processing time
      issuedDate: analysis.keyFields?.issueDate || null,
      validity: analysis.validity || "Permanent",
    },
  });

  return doc.save();
};

/**
 * Sanitize text input to prevent API failures.
 */
const sanitizeText = (text) => {
  return text.replace(/[^\w\s]/gi, ""); // Remove special characters
};

/**
 * Delete file after processing.
 */
const cleanupFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlink(filePath, (err) => {
      if (err) logger.error("Error deleting file:", err);
    });
  }
};
