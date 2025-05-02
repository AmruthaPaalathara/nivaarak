
const Certificate = require("../../models/application/certificateApplicationSchema");

// Admin: Fetch All Applications
exports.getAllApplicationsForAdmin = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const statusFilter = req.query.status; // Optional: ?status=Pending
        const skip = (page - 1) * limit;

        const query = statusFilter ? { status: statusFilter } : {};

        const applications = await Certificate.find(query)
            .populate({
                path: "documentType",
                model: "UserDocument",
                select: "documentType files submittedAt"
            })
            .sort({
                emergencyLevel: 1,  // Critical first
                requiredBy: 1,      // Sooner dates first
                createdAt: -1       // Newer applications first
            })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Certificate.countDocuments(query);

        res.status(200).json({
            success: true,
            totalApplications: total,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            data: applications
        });
    } catch (error) {
        console.error("❌ Admin fetching applications failed:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

const getAdminApplicationChartStats = async (req, res) => {
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
