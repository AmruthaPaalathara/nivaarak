
const Certificate = require("../../models/application/certificateApplicationSchema");
const extractText = require("../../middleware/extraction/extractUploadedText");
const path = require("path");
const DepartmentMapping = require('../../models/application/departmentMapping');
const { User } = require("../../models/authentication/userSchema")
const UserDocument = require("../../models/application/userDocumentSchema");

// Map emergency levels into sort order
const EMERGENCY_ORDER = { Critical: 1, High: 2, Medium: 3, Low: 4 };

exports.getAllAdminApplications = async (req, res) => {
    try {
        // 1) Fetch raw applications + populate only the applicant (User) by userId
        let applications = await Certificate.find(
            {},                            // no filter
            {                              // projection: include only the fields you care about
                firstName: 1,
                lastName: 1,
                documentType: 1,
                emergencyLevel: 1,
                requiredBy: 1,
                status: 1,
                email: 1,                    // <<–– make sure you project the saved email
            }
        )
            // .populate({
            //     path: "applicant",
            //     model: "User",
            //     localField: "applicant",
            //     select: "username",
            //     match: { userId: { $exists: true } },
            //     foreignField: "userId"
            // })
            // .populate("applicant", "first_name last_name") // get live names
            .sort({ emergencyLevel: 1, requiredBy: 1, createdAt: -1 })
            .lean();

        if (!applications.length) {
            return res.status(404).json({ message: "No applications found." });
        }

        // 2) Build a lookup map from your UserDocument collection by the string field
        const types = [...new Set(applications.map(app => app.documentType))];
        const docs  = await UserDocument.find(
            { documentType: { $in: types } },
            { documentType: 1 }
        )
            .select("documentType")
            .lean();

        const docMap = docs.reduce((m, d) => {
            m[d.documentType] = d.documentType;  // key and value both the human‐readable name
            return m;
        }, {});

        // 3) Attach `documentTypeName` to each app
        applications = applications.map(app => ({
            // ...app,
            _id:                app._id,
            applicantName:    `${app.firstName} ${app.lastName}`,
            email:              app.email,
            documentType:       app.documentType,
            documentTypeName:   docMap[app.documentType] || app.documentType || "Unknown",
            emergencyLevel:     app.emergencyLevel,
            requiredBy:         app.requiredBy,
            status:             app.status,
        }));

        // 4) Sort by emergencyLevel then by requiredBy date
        applications.sort((a, b) => {
            const ea = EMERGENCY_ORDER[a.emergencyLevel] || 99;
            const eb = EMERGENCY_ORDER[b.emergencyLevel] || 99;
            if (ea !== eb) return ea - eb;

            const da = a.requiredBy ? new Date(a.requiredBy) : new Date(8640000000000000);
            const db = b.requiredBy ? new Date(b.requiredBy) : new Date(8640000000000000);
            return da - db;
        });

        return res.status(200).json({ success: true, applications, total: applications.length});
    } catch (error) {
        console.error("Error fetching all admin applications:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch data" });
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


// ─── A) List of Departments ────────────────────────────────────────────────────
exports.getAllDepartments = async (req, res) => {
    try {
        const depts = await DepartmentMapping
            .find({}, 'department')
            .sort('department')
            .lean();
        const unique = [...new Set(depts.map(d => d.department))];
        res.json({ success: true, departments: unique });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Could not load departments' });
    }
};


// ─── B) Fetch applications (with applicantName & department) ────────────────────
exports.getDepartmentApplications = async (req, res) => {
    try {
        const { department } = req.query;
        console.log("→ Requested department filter:", department);

        // 1️⃣ get all mappings for that department (or all if “All”)
        const mappingFilter = (department && department !== "All")
            ? { department: { $regex: `^${department.trim()}$`, $options: "i" } }
            : {};

        const dmDocs = await DepartmentMapping
            .find(mappingFilter)
            .select("documentType department")
            .lean();
        console.log("→ DepartmentMapping results:", dmDocs);

        // If user chose a real department but no mapping found, return empty immediately
        if (department && department !== "All" && dmDocs.length === 0) {
            return res.json({ success: true, applications: [] });
        }

        const validTypes = dmDocs.map(d => d.documentType);
        console.log("→ documentTypes in department:", validTypes);

        // 2️⃣ fetch certificates whose documentType is in that list (or all if “All”)
        const certFilter = (department && department !== "All")
            ? { documentType: { $in: validTypes } }
            : {};

        // 1) load certificates
        let apps = await Certificate.find(certFilter).lean();
        console.log(`→ Found ${apps.length} matching certificates`);

        // 2) fetch all users whose userId appears
        const userIds = [...new Set(apps.map(a => a.applicant))];
        const users = await User.find({ userId: { $in: userIds } })
            .select("userId first_name last_name")
            .lean();
        const userMap = users.reduce((m,u) => {
            m[u.userId] = `${u.first_name} ${u.last_name}`;
            return m;
        }, {});

        const deptMap   = dmDocs.reduce((m,d) => {
            m[d.documentType] = d.department;
            return m;
        }, {});

        // 4) attach applicantName & department to each record
        apps = apps.map(a => ({
            ...a,
            applicantName: userMap[a.applicant] || "Unknown",

            department:    deptMap[a.documentType] || 'Unknown'
        }));

        // 5) now do the filter in JS
        const filtered = (!department || department === "All")
            ? apps
            : apps.filter(a => a.department === department);

        return res.json({ success: true, applications: filtered });

    } catch (err) {
        console.error("❌ Error fetching department applications:", err);
        return res.status(500).json({ success: false, message: 'Failed to fetch applications' });
    }
};

exports.getStatusApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const query = (status && status !== "All") ? { status } : {};

        // 1️⃣ Fetch raw apps
        let applications = await Certificate.find(query).lean();

        // if no apps, bail early
        if (!applications.length) {
            return res.status(404).json({ message: "No applications found for the selected status." });
        }

        // 2️⃣ Lookup users to build applicantName
        const userIds = [...new Set(applications.map(a => a.applicant))];
        const users = await User.find({ userId: { $in: userIds } })
            .select("userId first_name last_name")
            .lean();

        const userMap = users.reduce((m, u) => {
            m[u.userId] = `${u.first_name} ${u.last_name}`.trim();
            return m;
        }, {});

        applications = applications.map(app => ({
            ...app,
            applicantName: userMap[app.applicant] || "Unknown"
        }));

        // 3️⃣ Attach human-readable documentTypeName
        const types = [...new Set(applications.map(a => a.documentType))];
        const dmDocs = await DepartmentMapping.find({ documentType: { $in: types } })
            .select("documentType department")
            .lean();

        const deptMap = dmDocs.reduce((m, d) => {
            m[d.documentType] = d.department;
            return m;
        }, {});

        applications = applications.map(app => ({
            ...app,

            department: deptMap[app.documentType] || "Unknown"
        }));

        // 4️⃣ Finally return
        return res.status(200).json({ applications });

    } catch (err) {
        console.error("Error fetching status applications:", err);
        return res.status(500).json({ error: "Failed to fetch data" });
    }
};

exports.checkApplication = async (req, res) => {
    try {
        const app = await Certificate.findById(req.params.id);
        if (!app) return res.status(404).json({ error: 'Application not found' });

        const extractedText = app.extractedDetails?.rawText;
        if (!extractedText || extractedText.length < 100) {
            return res.status(400).json({ error: 'Insufficient extracted text for AI verification' });
        }

        const documentType = app.documentType || "document";
        const userQuery = `Check if the user is eligible for a ${documentType} based on the uploaded document.`;

        const { data: ragResult } = await axios.post("http://localhost:3001/api/admin-dashboard/rag/verify-context", {
            userQuery,
        });

        const aiResponse = ragResult.aiResponse || "";
        const eligible = aiResponse.toLowerCase().startsWith("yes");

        return res.json({
            eligible,
            mismatchReasons: eligible ? [] : [aiResponse],
            confidence: ragResult.similarityScore,
        });

    } catch (err) {
        console.error("checkApplication error:", err);
        return res.status(500).json({ error: "Server error during eligibility check" });
    }
};

