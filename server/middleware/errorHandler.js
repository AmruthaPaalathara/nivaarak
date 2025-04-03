module.exports = (err, req, res, next) => {
    console.error(" System Error:", err);

    const statusCode = err.statusCode || 500;

    // Standard response structure
    const response = {
        status: "error",
        message: err.message || "An unexpected error occurred",
    };

    //  Handle PDF Processing Errors
    if (err.name === "PDFProcessingError") {
        response.details = {
            fileSize: err.fileSize || "Unknown",
            pagesAttempted: err.pages || 0,
            ocrUsed: err.ocrUsed || false
        };
    }

    //  Handle Groq API Errors
    if (err.name === "GroqAPIError") {
        response.details = {
            modelUsed: err.model || "Unknown",
            promptLength: err.promptLength || "Unknown"
        };
    }

    //  Handle Validation Errors (e.g., Mongoose)
    if (err.name === "ValidationError") {
        response.details = err.errors;
    }

    //  Handle MongoDB Errors (e.g., Duplicate Keys)
    if (err.name === "MongoError" || err.code === 11000) {
        response.message = "Duplicate entry detected";
    }

    //  Add stack trace in development mode
    if (process.env.NODE_ENV === "development") {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};
