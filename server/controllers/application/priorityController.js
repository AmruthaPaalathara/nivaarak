const CertificateApplication = require("../../models/application/certificateApplicationSchema");
const Priority = require("../../models/application/prioritySchema");
const { getPriority, getDepartment } = require("../../util/priorityUtils");

// Assign Priority and Route Application
exports.assignPriorityAndRoute = async (req, res) => {
  try {
    const { applicationId, certificateType } = req.body;

    if (!applicationId || !certificateType) {
      return res.status(400).json({ success: false, error: "Application ID and certificate type are required" });
    }

    // Get priority level and assigned department
    const priorityLevel = getPriority(certificateType);
    const assignedDepartment = getDepartment(certificateType);

    // Update the application with priority and department
    const updatedApplication = await CertificateApplication.findByIdAndUpdate(
      applicationId,
      { priority: priorityLevel, department: assignedDepartment },
      { new: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    res.status(200).json({
      success: true,
      message: "Priority assigned and department routed successfully",
      application: updatedApplication,
    });
  } catch (error) {
    console.error("Error assigning priority and routing:", error);
    res.status(500).json({ success: false, error: "Failed to assign priority and route application" });
  }
};

// Get All Applications (Sorted by Priority)
exports.getPrioritizedApplications = async (req, res) => {
  try {
    const applications = await CertificateApplication.find()
      .sort({ priority: -1 }) // Higher priority first
      .populate("applicant", "username email")
      .select("-__v");

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching prioritized applications:", error);
    res.status(500).json({ success: false, error: "Failed to fetch applications" });
  }
};

//  Get Applications for a Specific Department
exports.getDepartmentApplications = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ success: false, error: "Department parameter is required" });
    }

    const applications = await CertificateApplication.find({ department })
      .populate("applicant", "username email")
      .select("-__v");

    res.status(200).json({ success: true, data: applications });
  } catch (error) {
    console.error("Error fetching department applications:", error);
    res.status(500).json({ success: false, error: "Failed to fetch department applications" });
  }
};

//  Update Application Priority Manually
exports.updatePriority = async (req, res) => {
  try {
    const { applicationId, newPriority } = req.body;

    if (!applicationId || typeof newPriority !== "number") {
      return res.status(400).json({ success: false, error: "Application ID and valid priority level are required" });
    }

    const updatedApplication = await CertificateApplication.findByIdAndUpdate(
      applicationId,
      { priority: newPriority },
      { new: true }
    );

    if (!updatedApplication) {
      return res.status(404).json({ success: false, error: "Application not found" });
    }

    res.status(200).json({ success: true, message: "Priority updated", application: updatedApplication });
  } catch (error) {
    console.error("Error updating priority:", error);
    res.status(500).json({ success: false, error: "Failed to update priority" });
  }
};
