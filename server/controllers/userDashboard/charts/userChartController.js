const Certificate = require("../../../models/application/certificateApplicationSchema");

exports.getUserApplicationStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const certificates = await Certificate.find({ applicant: userId })
            .populate("documentType", "documentType")
            .select("documentType status")
            .lean(); // <-- Always lean when you want simple objects

        if (!certificates || certificates.length === 0) {
            return res.json({ success: true, totalApplications: [], statusBreakdown: [] });
        }

        // Map-based for better performance
        const typeCountMap = new Map();
        const statusMap = new Map();

        certificates.forEach(cert => {
            const docTypeName = cert.documentType?.documentType || "Unknown"; // 👈 Fetch documentType name properly

            typeCountMap.set(docTypeName, (typeCountMap.get(docTypeName) || 0) + 1);

            const key = `${docTypeName}|${cert.status}`;
            statusMap.set(key, (statusMap.get(key) || 0) + 1);
        });

        const totalApplications = Array.from(typeCountMap, ([docType, count]) => ({
            _id: docType,
            count
        }));

        const statusBreakdown = Array.from(statusMap, ([key, count]) => {
            const [documentType, status] = key.split("|");
            return {
                _id: { documentType, status },
                count
            };
        });

        res.json({ success: true, totalApplications, statusBreakdown });
    } catch (error) {
        console.error("Error fetching application stats:", error);
        res.status(500).json({ success: false, message: "Failed to fetch application stats" });
    }
};