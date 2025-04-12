const mongoose = require("mongoose");

const applicationSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    certificateType: { type: String, required: true },
    priority: { type: Number, required: true },
    department: { type: String, required: true },
    status: { type: String, default: "Pending" },
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Priority", applicationSchema);
