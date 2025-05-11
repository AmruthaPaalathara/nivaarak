const Priority = require('../../models/application/prioritySchema');
const { getApplicationPriority } = require('../../utils/prioritiseApplication');

const submitPriorityApplication = async (req, res) => {
  try {
    const { userId, certificateType, department, isEmergency, requiredBy  } = req.body;

    if (!userId || !certificateType || !department) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const cleanedType = certificateType.trim();
    const priority = getApplicationPriority(cleanedType);

    console.log(" Incoming request: POST /api/priority-applications/submit");
    console.log(" Application Received:");
    console.log(`User ID: ${userId}`);
    console.log(`Certificate Type: ${cleanedType}`);
    console.log(`Assigned Priority: ${priority}`);
    console.log(`Department: ${department}`);
    console.log(`Emergency: ${isEmergency}`);
    console.log('------------------------------------------');

    const newApp = new Priority({
      userId,
      certificateType: cleanedType,
      priority,
      department,
      isEmergency: isEmergency === true || isEmergency === 'true',
      requiredBy,
    });

    await newApp.save();
    res.status(201).json({ success: true, message: 'Application submitted', application: newApp });

  } catch (err) {
    console.error('Error submitting priority application:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

const getAllPriorityApplications = async (req, res) => {
  try {
    const apps = await Priority.find().sort({ isEmergency: -1, priority: 1, timestamp: 1 });
    res.status(200).json({ success: true, total: apps.length, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch applications' });
  }
};

const updatePriorityStatus = async (req, res) => {
  try {
    const id = req.params.id;
    const { status } = req.body;
    if (!['Approved', 'Rejected', 'Pending'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    const updated = await Priority.findByIdAndUpdate(id, { status }, { new: true });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    res.status(200).json({ success: true, message: 'Status updated', data: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  submitPriorityApplication,
  getAllPriorityApplications,
  updatePriorityStatus,
};
