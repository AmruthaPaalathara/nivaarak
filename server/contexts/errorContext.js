const logger = require("../utils/logger");

// Function to log errors
const reportError = (error) => {
    console.error("Logged Error:", error);
    logger.error(error.message || "Unknown error");
};

module.exports = { reportError };
