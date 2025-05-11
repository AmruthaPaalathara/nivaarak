//gets details of logged in users

const { User } = require("../../models/authentication/userSchema"); // Ensure the correct model is used
const Certificate = require("../../models/application/certificateApplicationSchema");
const UserDocument = require("../../models/application/userDocumentSchema");
const Eligibility = require("../../models/eligibility/eligibilitySchema");

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

    // Fetch certificate applications
    let certificateApplications = await Certificate.find({ applicant: userId }).lean();
    let eligibilityApplications = await Eligibility.find({ applicant: userId }).lean();

    // Fetch all referenced documentType IDs
    const docTypes = [...new Set(certificateApplications.map(app => app.documentType))];
    const documentTypeMap = await UserDocument.find({
      userId,
      documentType: { $in: docTypes }
    })
        .lean()
        .then(docs => {
          const map = {};
          docs.forEach(d => { map[d.documentType] = d.documentType; });
          return map;
        });

// Then when you rewrite each application:
    certificateApplications.forEach(app => {
      app.documentType = documentTypeMap[app.documentType] || "Unknown";
    });

    console.log("Document type in getUserApplicationTableData function in userDashboardController file is: ", documentTypeMap)
    // Replace ObjectId in certificateApplications with actual document type name
    certificateApplications.forEach(app => {
      app.documentType = documentTypeMap[app.documentType.toString()] || "Unknown";  //  Ensure correct lookup
    });

    let allApplications = [...certificateApplications, ...eligibilityApplications];

    console.log("Final Table API Response:", allApplications);

    res.json({ success: true, applications: allApplications });
  } catch (error) {
    console.error("Error fetching table data:", error);
    res.status(500).json({ success: false, message: "Failed to fetch application table data" });
  }
};