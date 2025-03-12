const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const mongoose = require("mongoose");
const ollama = require("ollama").default;
const Document = require("./models/documentSchema");

// Function to extract text from PDF using Python script
const extractTextFromPdf = (pdfPath) => {
    return new Promise((resolve, reject) => {
        const scriptPath = path.join(__dirname, "process_pdf.py");

        exec(`python3 ${scriptPath} "${pdfPath}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(" Error running Python script:", stderr);
                return reject("Failed to extract text from PDF");
            }
            resolve(stdout.trim()); // Extracted text from Python script
        });
    });
};

// Function to process text with LLaMA 3
const extractDetailsWithLlama = async (text) => {
    console.log(" Sending extracted text to LLaMA 3...");

    const prompt = `
    Extract the following details from the given text:
    - Name of Candidate
    - Home Address
    - Name of Father
    - Name of Mother
    - Date of Birth (in figures)

    Text:
    ${text}

    IMPORTANT: Provide only a valid JSON response. Do not add any extra text before or after the JSON.
    
    Example response format:
    {
      "Name of Candidate": "",
      "Home Address": "",
      "Name of Father": "",
      "Name of Mother": "",
      "Date of Birth": ""
    }`;

    try {
        const response = await ollama.chat({
            model: "llama3:latest",
            messages: [{ role: "user", content: prompt }]
        });

        const rawDetails = response.message.content.trim(); // Remove extra spaces

        console.log(" LLaMA 3 Raw Response:", rawDetails);

        //  Extract JSON from the response safely
        const jsonStart = rawDetails.indexOf("{");
        const jsonEnd = rawDetails.lastIndexOf("}") + 1;

        if (jsonStart === -1 || jsonEnd === 0) {
            throw new Error("LLaMA 3 did not return valid JSON");
        }

        const cleanJson = rawDetails.substring(jsonStart, jsonEnd);

        //  Validate JSON format
        const detailsDict = JSON.parse(cleanJson); // This ensures we only save valid JSON

        console.log(" Extracted clean JSON:", detailsDict);
        return detailsDict;  // Return as a JavaScript object

    } catch (error) {
        console.error(" LLaMA 3 JSON Parsing Error:", error);
        return null;
    }
};


// Function to extract and store details
const processPdf = async (pdfPath) => {
    try {
        console.log(` Processing PDF: ${pdfPath}`);

        const extractedText = await extractTextFromPdf(pdfPath);
        if (!extractedText) throw new Error("No text extracted!");

        const extractedDetails = await extractDetailsWithLlama(extractedText);
        if (!extractedDetails) throw new Error("Failed to extract details!");

        // Save extracted details to MongoDB
        const newDocument = new Document({
            filename: path.basename(pdfPath),
            extractedText,
            extractedDetails
        });

        await newDocument.save();
        console.log(" Document saved to MongoDB:", newDocument);

        return newDocument;
    } catch (error) {
        console.error(" Processing Error:", error);
        return null;
    }
};

module.exports = { processPdf };
