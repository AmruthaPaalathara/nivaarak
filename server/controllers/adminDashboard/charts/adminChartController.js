const Certificate = require("../../../models/application/certificateApplicationSchema");

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
        const aggregation = await Certificate.aggregate([
            {
                $group: {
                    _id: "$documentType",
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const chartData = aggregation.map((entry) => ({
            documentType: entry._id,
            count: entry.count
        }));

        res.status(200).json({ success: true, data: chartData });
    } catch (err) {
        console.error("Admin chart error:", err);
        res.status(500).json({ success: false, message: "Failed to fetch admin chart data" });
    }
};
