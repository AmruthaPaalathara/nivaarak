// server/api/documentService.js
const UserDocument = require("../models/application/userDocumentSchema");

// Fetch all documents for a given userId
exports.getUserDocumentsByUserId = async (userId) => {
  if (!userId) {
    throw new Error("Missing userId");
  }
  // Return a lean array to improve performance if you don't need mongoose document methods
  return UserDocument.find({ userId }).lean();
};

// Return the list of all possible document types (merged with whatever the user has already uploaded)
exports.getAvailableDocumentTypesForUser = async (userId) => {
  const MASTER_TYPES = [
    "Birth Certificate",
    "Death Certificate",
    "Income Certificate",
    "Domicile Certificate",
    "Caste Certificate",
    "Agricultural Certificate",
    "Non- Creamy Layer",
    "Property Documents",
    "Marriage Certificates",
    "Senior Citizen Certificate",
    "Solvency Certificate",
    "Shop and Establishment Registration",
    "Contract Labour License",
    "Factory Registration Certificate",
    "Boiler Registration Certificate",
    "Landless Certificate",
    "New Water Connection"
  ];

  // Load the types the user has already submitted
  const docs = await UserDocument.find({ userId })
      .select("documentType -_id")
      .lean();

  const userTypes = docs.map(d => d.documentType);
  // Merge, dedupe, and return
  const merged = Array.from(new Set([...userTypes, ...MASTER_TYPES]));
  return merged;
};
