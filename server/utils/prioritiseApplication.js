// server/utils/prioritiseApplication.js

const ApplicationPriority = require('../models/application/applicationPrioritySchema');

// Directly map document types to lowercase
const priorityMap = Object.fromEntries(
    Object.entries(ApplicationPriority).map(([key, value]) => [key.toLowerCase(), value])
);

function getApplicationPriority(documentType) {
    if (!documentType || typeof documentType !== 'string') return ApplicationPriority["Other"];

    const cleaned = documentType.trim().toLowerCase();

    // Use the priority map directly
    const priority = priorityMap[cleaned];

    if (priority === undefined) {
        console.warn(`⚠️ No exact match for "${documentType}". Falling back to "Other".`);
    }

    return priority || ApplicationPriority["Other"];
}

module.exports = { getApplicationPriority };
