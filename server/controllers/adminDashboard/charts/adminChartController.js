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
        // 1) Fetch all apps as plain JS objects
        const allApps = await Certificate.find().lean();

        // 2) Tally totals and status breakdown keyed by the string field
        const totalMap  = {};  // { [docType]: totalCount }
        const statusMap = {};  // { [`${docType}_${status}`]: count }

        allApps.forEach(app => {
            const docType = app.documentType || "Unknown";
            const status  = app.status;

            // total per documentType
            totalMap[docType] = (totalMap[docType] || 0) + 1;

            // breakdown by status
            const key = `${docType}_${status}`;
            statusMap[key] = (statusMap[key] || 0) + 1;
        });

        // 3) Convert into arrays
        const totalApplications = Object.entries(totalMap).map(([documentType, count]) => ({
            documentType,
            count
        }));

        const statusBreakdown = Object.entries(statusMap).map(([key, count]) => {
            const [documentType, status] = key.split("_");
            return { documentType, status, count };
        });

        return res.status(200).json({
            success: true,
            totalApplications,
            statusBreakdown
        });
    } catch (err) {
        console.error("Admin chart error:", err);
        return res.status(500).json({ success: false, message: "Failed to fetch admin chart data" });
    }
};

