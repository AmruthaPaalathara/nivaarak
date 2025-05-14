//gets details of logged in users

const { User } = require("../../models/authentication/userSchema"); // Ensure the correct model is used
const Certificate = require("../../models/application/certificateApplicationSchema");
const UserDocument = require("../../models/application/userDocumentSchema");
const Eligibility = require("../../models/eligibility/eligibilitySchema");
const DepartmentMapping = require("../../models/application/DepartmentMapping");

//  GET User Profile
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId; // From auth middleware
    const user = await User.findOne({ userId }).select("-password");

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    const allApplications = await Certificate.find({ applicant: userId });
    const emergencyCount = allApplications.filter(app => app.emergency === true).length;

    const stats = {
      totalSubmitted: allApplications.length,
      emergencyCount: emergencyCount
    };

    // Log response for debugging
    console.log("Profile API response:", { user, stats });

    res.json({ success: true, data: { user, stats } });

  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve user profile" });
  }
};

// UPDATE User Profile
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const updatedData = req.body;

    const updatedUser = await User.findOneAndUpdate(
        { userId },
        updatedData,
        { new: true, runValidators: true, context: 'query' }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "Profile updated", user: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ success: false, error: "Failed to update profile" });
  }
};

// DELETE User
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.user.userId;
    const deletedUser = await User.findOneAndDelete({ userId });

    if (!deletedUser) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, message: "User account deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
};

exports.getUserApplicationTableData = async (req, res) => {
  console.log("getUserApplicationTableData is hitting in controller");
  try {
    const userId = req.user.userId;
    console.log("Fetching user applications for:", userId);

    // 1) Load user’s applications
    const certificateApplications = await Certificate.find({ applicant: userId }).lean();
    const eligibilityApplications = await Eligibility.find({ applicant: userId }).lean();

    // 2) Gather all documentTypes to lookup departments
    const allDocTypes = [
      ...new Set(
          certificateApplications
              .concat(eligibilityApplications)
              .map(app => app.documentType)
      )
    ];

    // 3) Fetch department mappings in one go
    const mappings = await DepartmentMapping.find({
      documentType: { $in: allDocTypes }
    })
        .lean();

    // 4) Build a lookup: { "Solvency Certificate": "Labour Department", … }
    const deptMap = mappings.reduce((map, m) => {
      map[m.documentType] = m.department;
      return map;
    }, {});

    console.log("Built department map:", deptMap);

    // 5) Annotate each application with its department (or "N/A")
    certificateApplications.forEach(app => {
      app.department = deptMap[app.documentType] || "N/A";
    });
    eligibilityApplications.forEach(app => {
      app.department = deptMap[app.documentType] || "N/A";
    });

    // 6) Combine lists and return
    const allApplications = [...certificateApplications, ...eligibilityApplications];
    console.log("Final Table API Response:", allApplications);

    return res.json({ success: true, applications: allApplications });
  } catch (error) {
    console.error("Error fetching table data:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch application table data"
    });
  }
};