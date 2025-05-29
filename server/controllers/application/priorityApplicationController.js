
// server/controllers/application/priorityApplicationController.js

const Certificate   = require("../../models/application/certificateApplicationSchema");
const UserDocument  = require("../../models/application/userDocumentSchema");
const { User }      = require("../../models/authentication/userSchema");

// define your emergency‐level sort order
const EMERGENCY_ORDER = { Critical: 1, High: 2, Medium: 3, Low: 4 };

const getAllPriorityApplications = async (req, res) => {
  try {
    // 1) Fetch all certificate applications
    let apps = await Certificate.find({}).lean();
    if (!apps.length) {
      return res.status(404).json({ success: false, message: "No applications found." });
    }

    // 2) Build userId -> "First Last" map
    const userIds = [...new Set(apps.map(a => a.applicant))];
    const users = await User.find({ userId: { $in: userIds } })
        .select("userId first_name last_name email")
        .lean();
    const userMap = users.reduce((m, u) => {
      m[u.userId] = {
        fullName: `${u.first_name} ${u.last_name}`,
        email: u.email
      };
      return m;
    }, {});

    // 3) Build documentType -> human-readable map
    const types = [...new Set(apps.map(a => a.documentType))];
    const docs  = await UserDocument.find({ documentType: { $in: types } })
        .select("documentType")
        .lean();
    const docMap = docs.reduce((m, d) => {
      m[d.documentType] = d.documentType;
      return m;
    }, {});

    // 4) Enrich and reshape each record
    const applications = apps.map(a => {

      const user = userMap[a.applicant] || {};
      const docTypeName = docMap[a.documentType] || a.documentType;

      // Calculate days to deadline
      const daysToDeadline = a.requiredBy
          ? Math.ceil((new Date(a.requiredBy) - new Date()) / (1000 * 60 * 60 * 24))
          : null;

      // Count past applications by same user
      const pastApplications = apps.filter(x => x.applicant === a.applicant && new Date(x.createdAt) < new Date()).length;

      return {
        _id:               a._id,
        applicantName: userMap[a.applicant]?.fullName || "Unknown",
        email:         userMap[a.applicant]?.email    || "Unknown",
        documentTypeName: docMap[a.documentType]            || a.documentType,
        priority:         a.priority                        || "N/A",
        emergencyLevel:   a.emergencyLevel                  || "Low",
        daysToDeadline,
        pastApplications,
        discrepant:        false,  // add your mismatch logic here
        status:           a.status                          || "Pending",
      };
    });

    // 5) Sort by emergency level then by nearest deadline
    applications.sort((x, y) => {
      const ea = EMERGENCY_ORDER[x.emergencyLevel] || 99;
      const eb = EMERGENCY_ORDER[y.emergencyLevel] || 99;
      if (ea !== eb) return ea - eb;
      return (x.daysToDeadline ?? Infinity) - (y.daysToDeadline ?? Infinity);
    });

    return res.json({ success: true, applications });

  } catch (err) {
    console.error("Priority-apps fetch error:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch priority applications." });
  }
};


const updatePriorityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log("⏩ updatePriorityStatus called with:", { id, status });

    // 1) Validate incoming status
    const allowed = ['Approved', 'Rejected', 'Pending'];
    if (!allowed.includes(status)) {
      return res
          .status(400)
          .json({ success: false, message: `Invalid status—must be one of ${allowed.join(', ')}` });
    }

    // 2) Find & update
    const app = await Certificate.findById(id);
    if (!app) {
      return res
          .status(404)
          .json({ success: false, message: 'Application not found' });
    }

    app.status = status;
    await app.save();

    // 3) Return the updated document
    return res.json({
      success: true,
      data: {
        applicationId: id,
        newStatus: status,
      }
    });

  } catch (err) {
    console.error("updatePriorityStatus error:", err);
    return res
        .status(500)
        .json({ success: false, message: 'Server error' });
  }
};

module.exports = {

  updatePriorityStatus,
  getAllPriorityApplications
};
