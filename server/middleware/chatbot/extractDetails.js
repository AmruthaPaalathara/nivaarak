const fs = require("fs"); //file system module for reading,checking existence and deleting files
const path = require("path"); //handles and transforms file paths
const pdfParse = require("pdf-parse");
const { exec } = require("child_process");
const axios = require("axios"); // HTTP client for making API requests (used to call Groq API)
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const Document = require("../../models/chatbot/documentSchema.js");

const PYTHON_CMD = process.platform === "win32" ? "python" : "python3";

// Log each step of the process
const logStep = (step, message, level = "info") => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level.toUpperCase()}] [${step}] ${message}`);
};

// Validate PDF file path
const validatePdfPath = (pdfPath) => {
  if (!fs.existsSync(pdfPath)) { //ensuring the file exists
    throw new Error(`PDF file not found: ${pdfPath}`);
  }
  if (path.extname(pdfPath).toLowerCase() !== ".pdf") {  //using path.extname ensuring that the file is a .pdf file 
    throw new Error(`Invalid file type: ${pdfPath}. Expected a PDF file.`);
  }
};

// Execute Python script with timeout 10s
const execWithoutTimeout = (command) => {
  return new Promise((resolve, reject) => {
    const processInstance = exec(command, (error, stdout, stderr) => { //runs the command using exec() function
      if (error) {
        reject({ status: "error", message: `Command failed: ${stderr || error.message}` });
      } else if (stderr) {
        reject({ status: "error", message: `Script error: ${stderr}` });
      } else {
        try {
          const result = JSON.parse(stdout);
          if (result.status === "success") {
            resolve(result);
          } else {
            reject({ status: "error", message: `Script failed: ${result.message}` });
          }
        } catch (parseError) {
          reject({ status: "error", message: `Failed to parse script output: ${stdout}` });
        }
      }
    });
  });
};


// Extract text from PDF using Python script
const extractDetailsMiddleware  = async (pdfPath) => {
  try {
    validatePdfPath(pdfPath);
    const scriptPath = path.join(__dirname, "../../extracting/process_pdf.py");
    const command = `${PYTHON_CMD} ${scriptPath} "${pdfPath}"`;

    logStep("Extract Text", `Running Python script: ${command}`);
    const result = await execWithoutTimeout(command );

    if (!result || !result.text) {
        logStep("Extract Text", "No text extracted from the document.");
        return ""; // Gracefully return empty string instead of throwing
    }

    logStep("Extract Text", "Text extraction successful");
    return result.text;
  } catch (error) {
    logStep("Extract Text", `Error: ${error.message}`, "error");
    throw new Error(`Text extraction failed: ${error.message}`);
  }
};

const callGroqAPI = async (prompt) => {
    try {

      const response = await axios.post(
        "https://api.groq.com/v1/chat/completions",
        {
          model: "llama3-8b-8192",
          messages: [{ role: "user", content: prompt }],
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.data.choices || !response.data.choices[0]?.message?.content) {
        throw new Error("Invalid response format from Groq API");
      }

      return response.data.choices[0].message.content.trim();
    } catch (error) {
      logStep("Groq API", `API request failed: ${error.message}`, "error");
      return "";

    }
  };

const extractTextFromPDF = async (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const dataBuffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(dataBuffer);

    return data.text ? data.text.trim() : "No text found in PDF.";
  } catch (error) {
    console.error(`Failed to extract text from PDF: ${error.message}`);
    return ""; // Return an empty string instead of null
  }
};

const processLargePDF = async (filePath) => {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(pdfBuffer);

    // Handle large PDFs by splitting them into chunks
    const textChunks = data.text ? data.text.match(/[\s\S]{1,5000}/g) || [""] : [""];

    console.log(`PDF split into ${textChunks.length} chunks`);

    const responses = await Promise.allSettled(textChunks.map((chunk) => callGroqAPI(chunk)));
    return responses.map(res => res.status === "fulfilled" ? res.value : "").join("\n");
  } catch (error) {
    logStep("Process PDF", `Error: ${error.message}`, "error");
    throw new Error("PDF processing failed");
  }
};

// Extract details dynamically using Groq LLaMA 3 API
const extractDetailsWithGroq = async (text) => {
  try {
    const prompt = `Extract key details from the following document:\n${text}`;
    logStep("Groq API", `Sending prompt to Groq API`);
    return await callGroqAPI(prompt);
  } catch (error) {
    logStep("Groq API", `Failed: ${error.message}`, "error");
    throw new Error("Failed to get AI response");
  }
};

// Process PDF and extract details
const processPdf = async (pdfPath) => {
  try {
    logStep("Process PDF", `Processing PDF: ${pdfPath}`);

    // Step 1: Extract text using Python
    const extractedText = await extractTextFromPDF(pdfPath);
    if (!extractedText || !extractedText.text) {
      throw new Error("No text extracted from the document.");
    }

    // Step 2: Extract structured details dynamically
    const extractedDetails = await extractDetailsWithGroq(extractedText.text);
    if (!extractedDetails) {
      throw new Error("Failed to extract structured details from the document.");
    }

    // Step 3: Save extracted details to MongoDB
    const newDocument = new Document({
      filename: path.basename(pdfPath),
      extractedText: extractedText.text,
      extractedDetails,
      metadata: extractedText.metadata || {},
    });

    try {
      await newDocument.save();
      logStep("MongoDB", "Document saved to MongoDB");
    } catch (error) {
      logStep("MongoDB", `Failed to save document: ${error.message}`, "error");
      throw new Error("Failed to save document to MongoDB");
    }

    // Step 4: Cleanup Temporary PDF File
try {
  if (fs.existsSync(pdfPath)) {
    fs.unlinkSync(pdfPath);
    logStep("Cleanup", `Temporary file deleted: ${pdfPath}`);
  }
} catch (error) {
  logStep("Cleanup", `Failed to delete temporary file: ${error.message}`, "error");
}

    return newDocument;
  } catch (error) {
    logStep("Error", `Processing failed: ${error.message}`, "error");
    throw error;
  }
};

module.exports = { processPdf, processLargePDF, extractDetailsMiddleware };