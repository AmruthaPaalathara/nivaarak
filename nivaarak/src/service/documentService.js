// src/services/documentService.js

import API from "../utils/api";

/**
 * Fetch the master list of document types (public endpoint).
 * @returns {Promise<string[]>} an array of document-type names
 */
export async function fetchDocumentTypes() {
    try {
        const res = await API.get("/certificates/all-document-types");
        // assume the server sends back { documentTypes: [...] }
        return res.data.documentTypes;
    } catch (err) {
        console.error("Failed to fetch document types:", err);
        // fallback array:
        return [

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
    }
}
