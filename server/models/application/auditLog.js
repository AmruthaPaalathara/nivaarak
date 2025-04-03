const mongoose = require("mongoose");

// Define possible action types
const ACTIONS = Object.freeze({
  SUBMITTED: "Submitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  UPDATED: "Updated",
  DELETED: "Deleted",
});

const auditLogSchema = new mongoose.Schema({
  action: {type: String, enum: Object.values(ACTIONS), // Restrict to predefined actions
            required: true},
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  application: { type: mongoose.Schema.Types.ObjectId, ref: "Certificate", required: true },
  details: { type: String }, // Additional details about the action
}, { timestamps: true });

// Add indexes for faster queries
auditLogSchema.index({ performedByUser: 1 });
auditLogSchema.index({ application: 1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
module.exports.ACTIONS = ACTIONS; // Export action constants for reuse