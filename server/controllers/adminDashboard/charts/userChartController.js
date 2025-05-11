const Certificate = require("../../../models/application/certificateApplicationSchema");

exports.getUserApplicationStats = async (req, res) => {
    try {
        const userId = req.user.userId;

        const aggregationResult = await Certificate.aggregate([
            { $match: { applicant: userId } },
            {
                $lookup: {
                    from: "userdocuments",
                    localField: "documentType",      // the string field in Certificate
                    foreignField: "documentType",    // match it against this field in UserDocument
                    as: "documentInfo"
                }
            },
            { $unwind: {path: "$documentInfo",preserveNullAndEmptyArrays: true } }, //  Extract documentType name
            {
                $group: {
                    _id: { $ifNull: ["$documentInfo.documentType", "Unknown"] },  // Use name field instead of ID
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.documentType": 1 } }
        ]);

        console.log("Aggregation result:", aggregationResult);

        const totalApplicationsMap = new Map();
        const statusBreakdown = [];

        aggregationResult.forEach(({ _id, count }) => {
            const docType = _id || "Unknown"; // ✅ Since `_id` is already the document type // ✅ Avoids defaulting to unknown
            totalApplicationsMap.set(docType, (totalApplicationsMap.get(docType) || 0) + count);

            statusBreakdown.push({
                documentType: docType,
                status: "Not Available",
                count
            });
        });

        const totalApplications = Array.from(totalApplicationsMap, ([docType, count]) => ({ documentType: docType, count }));

        res.json({ success: true, totalApplications, statusBreakdown });

        console.log("Drill-down API Response:", { totalApplications, statusBreakdown });
    } catch (error) {
        console.error("Error fetching application stats:", error);
        res.status(500).json({ success: false, message: "Failed to fetch application stats" });
    }
};