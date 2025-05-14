// server/controllers/adminDashboard/charts/userChartController.js

const Certificate = require("../../../models/application/certificateApplicationSchema");

exports.getUserApplicationStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        // 1) Total count per document type
        const totalApplications = await Certificate.aggregate([
            { $match: { applicant: userId } },
            { $group: {
                    _id: "$documentType",
                    count: { $sum: 1 }
                }},
            { $project: { _id: 0, documentType: "$_id", count: 1 }},
            { $sort: { documentType: 1 } }
        ]);

        // 2) Breakdown by documentType AND status
        const statusBreakdown = await Certificate.aggregate([
            { $match: { applicant: userId } },
            { $group: {
                    _id: { documentType: "$documentType", status: "$status" },
                    count: { $sum: 1 }
                }},
            { $project: {
                    _id: 0,
                    documentType: "$_id.documentType",
                    status:       "$_id.status",
                    count:        1
                }},
            { $sort: { documentType: 1, status: 1 } }
        ]);

        console.log("Drill-down API Response:", { totalApplications, statusBreakdown });

        return res.json({
            success: true,
            totalApplications,
            statusBreakdown
        });
    } catch (error) {
        console.error("Error fetching application stats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch application stats"
        });
    }
};
