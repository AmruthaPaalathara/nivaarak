const Session = require("../models/authentication/sessionSchema");
const crypto = require("crypto");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");  // Assuming you have a logger utility

// Create a new session
const createSession = async (userId, deviceInfo, ipAddress) => {
  try {
    const sessionId = uuidv4();
    const session = new Session({
      sessionId,
      userId,
      deviceInfo,
      ipAddress,
    });

    await session.save();
    logger.info(`Session created for user ${userId} with sessionId ${sessionId}`);
    return session;
  } catch (error) {
    logger.error(`Error creating session for user ${userId}: ${error.message}`);
    throw new Error("Failed to create session");
  }
};

// Update session status
const updateSessionStatus = async (sessionId, status) => {
  try {
    const session = await Session.findOneAndUpdate(
        { sessionId },
        { status },
        { new: true }
    );

    if (!session) {
      logger.warn(`Session not found for sessionId ${sessionId}`);
      throw new Error("Session not found");
    }

    logger.info(`Session status updated for sessionId ${sessionId} to ${status}`);
    return session;
  } catch (error) {
    logger.error(`Error updating session status for sessionId ${sessionId}: ${error.message}`);
    throw new Error("Failed to update session status");
  }
};

// Optional: Implement session expiry logic (if required)
// const expireSession = async (sessionId) => {
//   await Session.findOneAndUpdate(
//     { sessionId },
//     { status: 'expired' },
//     { new: true }
//   );
// };

module.exports = { createSession, updateSessionStatus };
