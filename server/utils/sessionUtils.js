const Session = require("../models/authentication/sessionSchema");
const crypto = require("crypto");

// Create a new session
const createSession = async (userId, deviceInfo, ipAddress) => {
  const session = new Session({
    sessionId: crypto.randomBytes(16).toString("hex"),
    userId,
    deviceInfo,
    ipAddress,
  });

  await session.save();
  return session;
};

// Update session status
const updateSessionStatus = async (sessionId, status) => {
  await Session.findOneAndUpdate(
    { sessionId },
    { status },
    { new: true }
  );
};

module.exports = { createSession, updateSessionStatus };