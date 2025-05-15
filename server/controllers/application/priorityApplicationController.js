const Priority = require('../../models/application/prioritySchema');
const { getApplicationPriority } = require('../../utils/prioritiseApplication');
const Certificate = require("../../models/application/certificateApplicationSchema");
const User          = require('../../models/authentication/userSchema');
const DepartmentMap = require('../../models/application/departmentMapping');

const submitPriorityApplication = async (req, res) => {
  try {
    const {
      userId,
      certificateType,
      department,
      requiredBy
    } = req.body;

    if (!userId || !certificateType || !department) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    // 1. Clean & base priority
    const cleanedType = certificateType.trim();
    const priority    = getApplicationPriority(cleanedType);

    const emergencyLevelUser = req.body.emergencyLevel;
    const isEmergency = ['Critical','High'].includes(emergencyLevelUser);

    // 2. Derive daysToDeadline
    const submissionDate = new Date();
    const deadlineDate   = new Date(requiredBy);
    const msPerDay       = 1000 * 60 * 60 * 24;
    const daysToDeadline = Math.round((deadlineDate - submissionDate) / msPerDay);

    // 3. Compute applicantAge, if you store dob on the User
    let applicantAge = null;
    const user = await User.findOne({ id: userId });
    if (user && user.dob) {
      const dob = new Date(user.dob);
      const msPerYear = 1000 * 60 * 60 * 24 * 365.25;
      applicantAge = Math.floor((Date.now() - dob) / msPerYear);
    }
    // — otherwise, add an 'age' or 'dob' field to your form/schema

    // 4. Count past applications
    const pastApplications = await Certificate.countDocuments({ applicant: userId });

    // 5. Look up / validate department mapping (fallback to “General”)
    const mapping = await DepartmentMap.findOne({ documentType: cleanedType });
    const assignedDept = mapping ? mapping.department : 'General';

    // 6. (Optional) Simple discrepancy check (rule‐based example)
    //    e.g. if someone under 18 applies for a “Pension Document”
    const isDiscrepant = (
        cleanedType === 'Pension Documents' &&
        applicantAge !== null &&
        applicantAge < 18
    );

    // 7. Save the Priority doc with all derived fields
    const newApp = new Priority({
      userId,
      certificateType: cleanedType,
      priority,
      department:     assignedDept,
      isEmergency:    isEmergency === true || isEmergency === 'true',
      requiredBy:     deadlineDate,
      // ––––––––––––– Derived signals below –––––––––––––
      daysToDeadline,
      applicantAge,
      pastApplications,
      isDiscrepant,              // if you’ve extended your schema
    });

    await newApp.save();

    console.log("✅ Priority Application saved with derived features:", {
      daysToDeadline,
      applicantAge,
      pastApplications,
      isDiscrepant,
    });

    return res
        .status(201)
        .json({ success: true, message: 'Application submitted', application: newApp });
  }
  catch (err) {
    console.error('Error submitting priority application:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getAllPriorityApplications = async (req, res) => {
  const apps = await Priority.find()
      .select('-__v')  // include daysToDeadline, applicantAge, pastApplications, isDiscrepant
      .sort({ isEmergency: -1, priority: 1, timestamp: 1 });
  res.json({ total: apps.length, data: apps });
};

const updatePriorityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    console.log("⏩ updatePriorityStatus:", { id: req.params.id, status: req.body.status });

    // 1. Validate incoming status
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res
          .status(400)
          .json({ success: false, message: 'Invalid status' });
    }

    console.log("Updating application", id, "to status", status);

    // 2. Update in MongoDB
    const app = await Priority.findByIdAndUpdate(id, { status }, { new: true });


    if (!app) {
      return res
          .status(404)
          .json({ success: false, message: 'Application not found' });
    }

    // 3. Return the new status so the client sees 200 OK
    return res.json({
      success: true,
      applicationId: id,
      newStatus: status
    });

  } catch (err) {
    console.error("updatePriorityStatus error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

module.exports = {
  submitPriorityApplication,
  updatePriorityStatus,
};
