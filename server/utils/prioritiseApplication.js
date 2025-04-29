// server/utils/prioritiseApplication.js

const ApplicationPriority = require('../models/application/applicationPrioritySchema');


function getApplicationPriority(documentType) {
    if (!documentType) return ApplicationPriority["Other"];

    const cleaned = documentType.trim().toLowerCase();

    // Build lowercase map to handle case-insensitive matching
    const priorityMap = Object.fromEntries(
        Object.entries(ApplicationPriority).map(([key, value]) => [key.toLowerCase(), value])
    );

    const priority = priorityMap[cleaned];

    if (priority === undefined) {
        console.warn(`⚠️ No exact match for "${documentType}". Falling back to "Other".`);
    }

    return priority || ApplicationPriority["Other"];
}

module.exports = { getApplicationPriority };