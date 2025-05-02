// server/models/applicationModel.js

const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    certificateType: { type: String, required: true },
    priority: { type: Number, required: true },
    department: { type: String, required: true },
    status: { type: String, default: "Pending" },
    isEmergency: { type: Boolean, default: false },
    emergencyLevel: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Low' },
    requiredBy: { type: Date },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Priority', applicationSchema);
