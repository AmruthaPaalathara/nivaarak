const mongoose = require("mongoose");
const crypto = require("crypto"); // Import missing crypto module
const {User } = require("./userSchema")

const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  userId: { type: Number, ref: "User", default: null, index: true }, // Use numeric userId
  deviceInfo: { type: String, default: "Unknown Device" },
  deviceType: { type: String, enum: ["desktop", "mobile", "tablet", "unknown"], default: "unknown" },
  browser: { type: String, default: "Unknown Browser" },
  os: { type: String, default: "Unknown OS" },
  ipAddress: { type: String, default: "0.0.0.0" },
  lastAccessed: { type: Date, default: Date.now },
  sessionType: { type: String, enum: ["web", "mobile", "api"], default: "web" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: parseInt(process.env.SESSION_EXPIRY) || 2592000, // Use integer (30 days)
    index: true,
  },
});

// Static method to create a session
sessionSchema.statics.createSession = async function (userId, deviceInfo, ipAddress) {
  const session = new this({
    sessionId: uuidv4(),
    userId,
    deviceInfo,
    ipAddress,
  });

  await session.save();
  return session;
};

// Static method to update session status
sessionSchema.statics.updateSessionStatus = async function (sessionId, status) {
  await this.findOneAndUpdate({ sessionId }, { status }, { new: true });
};

module.exports = mongoose.model("Session", sessionSchema);
