
const Certificate = require("../../models/application/certificateApplicationSchema");
const extractText = require("../../middleware/extraction/extractUploadedText");
const path = require("path");
const DepartmentMapping  = require("../../models/application/DepartmentMapping");
const { User } = require("../../models/authentication/userSchema")
const UserDocument = require("../../models/application/userDocumentSchema");
// Admin: Fetch All Applications
exports.getAllApplicationsForAdmin = async (req, res) => {
    try {
        const page         = parseInt(req.query.page)  || 1;
        const limit        = parseInt(req.query.limit) || 20;
        const statusFilter = req.query.status; // e.g. ?status=Pending
        const skip         = (page - 1) * limit;
        const query        = statusFilter ? { status: statusFilter } : {};

        // 1) Build & execute your query with applicant populated
        let applications = await Certificate.find(query)
            .populate({
                path:      "applicant",
                model:     "User",
                select:    "username",
                match:     { userId: { $exists: true } },
                foreignField: "userId"
            })
            .sort({ emergencyLevel: 1, requiredBy: 1, createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // 2) Attach human-readable documentType
        const types   = [...new Set(applications.map(a => a.documentType))];
        const userDocs= await UserDocument.find({ documentType: { $in: types } })
            .select("documentType")
            .lean();
        const docMap  = userDocs.reduce((m, d) => {
            m[d.documentType] = d.documentType;
            return m;
        }, {});

        // 3) Attach department from your mapping collection
        const mappings    = await DepartmentMapping.find().lean();
        const departmentMap = mappings.reduce((m, d) => {
            m[d.documentType] = d.department;
            return m;
        }, {});
        applications = applications.map(app => ({
            ...app,
            documentTypeName: docMap[app.documentType] || "Unknown",
            department: departmentMap[app.documentType] || "Unknown"
        }));

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


exports.performTextExtraction = async (req, res) => {
    const { applicationId } = req.params;

    try {
        const application = await Certificate.findById(applicationId);
        if (!application || !application.flatFiles || application.flatFiles.length === 0) {
            return res.status(404).json({ success: false, message: "No documents found for this application." });
        }

        const results = [];
        for (const relPath of application.flatFiles) {
            const absPath = path.join(__dirname, "../../uploads/applications", relPath);
            const result = await extractText(absPath);
            results.push(result.text || "");
        }

        const combinedText = results.join("\n").trim();

        // Update the application with extracted text
        application.extractedDetails = { rawText: combinedText };
        await application.save();

        return res.status(200).json({
            success: true,
            message: "Text successfully extracted and stored.",
            text: combinedText
        });
    } catch (error) {
        console.error("Text extraction failed:", error);
        return res.status(500).json({ success: false, message: "Text extraction failed." });
    }
};

exports.getAllAdminApplications = async (req, res) => {
    try {
        // 1) Fetch and populate applicant username
        let applications = await Certificate.find()
            .populate({
                path: "applicant",
                model: "User",
                select: "username",
                match: { userId: { $exists: true } },
                foreignField: "userId"
            })
            .sort({ emergencyLevel: 1, requiredBy: 1, createdAt: -1 })
            .lean();

        if (!applications.length) {
            return res.status(404).json({ message: 'No applications found.' });
        }

        // 2) Build a lookup for human-readable documentType names
        const types = [...new Set(applications.map(app => app.documentType))];
        const docs  = await UserDocument.find({ documentType: { $in: types } })
            .select("documentType")
            .lean();
        const docMap = docs.reduce((m, d) => { m[d.documentType] = d.documentType; return m; }, {});

        // 3) Attach the documentTypeName to each application
        applications = applications.map(app => ({
            ...app,
            documentTypeName: docMap[app.documentType] || "Unknown"
        }));

        return res.status(200).json({ success: true, applications });
    } catch (error) {
        console.error('Error fetching all admin applications:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch data' });
    }
};

// Fetch department-specific applications
exports.getDepartmentApplications = async (req, res) => {
    try {
        const { department } = req.query;
        const query = (department && department !== "All")
            ? { department }
            : {};

        // 1) Fetch & populate applicant
        let applications = await Certificate.find(query)
            .populate({
                path:      "applicant",
                model:     "User",
                select:    "username",
                match:     { userId: { $exists: true } },
                foreignField: "userId"
            })
            .sort({ emergencyLevel: 1, requiredBy: 1, createdAt: -1 })
            .lean();

        // 2) Replace documentType string with itself (just ensure it exists)
        const types = [...new Set(applications.map(a => a.documentType))];
        const docs  = await UserDocument.find({ documentType: { $in: types } })
            .select("documentType")
            .lean();
        const map   = docs.reduce((m, d) => {
            m[d.documentType] = d.documentType;
            return m;
        }, {});
        applications = applications.map(app => ({
            ...app,
            documentTypeName: map[app.documentType] || "Unknown"
        }));

        if (!applications.length) {
            return res.status(404).json({ message: "No applications found." });
        }
        res.status(200).json({ success: true, applications });
    } catch (err) {
        console.error("❌ Error fetching department applications:", err);
        res.status(500).json({ success: false, error: "Failed to fetch data" });
    }
};

exports.getStatusApplications = async (req, res) => {
    try {
        const { status } = req.query;  // Get status filter from query params
        let query = {};
        if (status && status !== 'All') {
            query.status = status;  // Filter by status if selected
        }

        const applications = await Certificate.find(query).lean(); // Using lean() for faster, non-Mongoose documents

        const types = [...new Set(applications.map(a => a.documentType))];

// 3. Lookup userDocs by string field
        const userDocs = await UserDocument.find({
            userId: { $exists:true },      // or your filter
            documentType: { $in: types }
        })
            .select("documentType")
            .lean();

// 4. Build map
        const docMap = userDocs.reduce((m, d) => {
            m[d.documentType] = d.documentType;
            return m;
        }, {});

// 5. Attach human‐readable docType into each record
        applications.forEach(app => {
            app.documentTypeName = docMap[app.documentType] || "Unknown";
        });

        if (!applications.length) {
            return res.status(404).json({ message: 'No applications found for the selected status.' });
        }

        res.status(200).json({ applications });  // Send applications data as response
    } catch (err) {
        console.error('Error fetching status applications:', err);
        res.status(500).json({ error: 'Failed to fetch data' });
    }
};

