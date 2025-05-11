const UserDocument = require("../../models/application/userDocumentSchema");

// Define the function
const getUserDocumentsByUserId = async (userId) => {
  return await UserDocument.find({ userId  }); // Assuming 'userId' is stored in the UserDocument model
};


exports.getUserDocuments = async (req, res) => {
  try {

    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: User ID missing" });
    }

    const userDocuments = await getUserDocumentsByUserId(userId);

    let documentTypes = [];

    const allTypes = [
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

    if (!userDocuments || userDocuments.length === 0) {
      documentTypes = allTypes;
    } else {
      const userTypes = userDocuments.map(doc => doc.documentType);
      documentTypes = [...new Set([...userTypes, ...allTypes])]; // avoid duplicates
    }
    res.json({ documentTypes });
  } catch (error) {
  console.error(" Error fetching document types:", {
    message: error.message,
    status: error.response?.status,
    data: error.response?.data,
    stack: error.stack,
  });
  return { success: false, types: [] };
}
};