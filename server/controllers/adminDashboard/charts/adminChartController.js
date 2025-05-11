const Certificate = require("../../../models/application/certificateApplicationSchema");
const UserDocument = require("../../../models/application/userDocumentSchema");

exports.getStatusStats = async (req, res) => {
    try {
        const [pending, approved, rejected] = await Promise.all([
            Certificate.countDocuments({ status: "pending" }),
            Certificate.countDocuments({ status: "approved" }),
            Certificate.countDocuments({ status: "rejected" }),
        ]);

        res.status(200).json({
            success: true,
            Pending: pending,
            Approved: approved,
            Rejected: rejected,
        });
    } catch (err) {
        console.error("❌ Error getting status stats:", err);
        res.status(500).json({ success: false, message: "Failed to fetch stats" });
    }
};

exports.getAdminApplicationChartStats = async (req, res) => {
    try {
        const allApplications = await Certificate.find().populate({
            path: "documentType",
            model: "UserDocument",
            select: "documentType"
        });

        const docMap = {};
        const statusMap = {};

        for (const app of allApplications) {
            const docType = app.documentType?.documentType || "Unknown";
            const status = app.status;

            // Count total
            docMap[docType] = (docMap[docType] || 0) + 1;

            // Count by status
            const key = `${docType}_${status}`;
            statusMap[key] = (statusMap[key] || 0) + 1;
        }

        const totalApplications = Object.entries(docMap).map(([type, count]) => ({
            documentType: type,
            count
        }));

        const statusBreakdown = Object.entries(statusMap).map(([key, count]) => {
            const [type, status] = key.split("_");
            return { documentType: type, status, count };
        });

        res.status(200).json({
            success: true,
            totalApplications,
            statusBreakdown
        });
    } catch (err) {
        console.error("Admin chart error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch admin chart data" });
    }
};
