const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Session = require("../../models/authentication/sessionSchema");
const { User} = require("../../models/authentication/userSchema.js");
const rateLimit = require('express-rate-limit');
const redisClient = require("../../config/redisConfig"); // Assuming Redis setup

const refreshTokens = new Map();
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

// Session expiry time (default: 1 hour)
const sessionExpiryTime = Number(process.env.SESSION_EXPIRY_TIME) || 60 * 60 * 1000;

const revokeToken = async (token, expiry) => {
  const hashedToken = hashToken(token);
  const ttl = Math.floor(expiry / 1000); // Convert ms to seconds
  await redisClient.setEx(`revokedToken:${hashedToken}`, ttl, "true");
};

const isTokenRevoked = async (token) => {
  try {
    const hashedToken = hashToken(token);
    return await redisClient.exists(`revokedToken:${hashedToken}`);
  } catch (error) {
    console.error("Error checking token revocation:", error);
    return false; // Assume not revoked if Redis fails
  }
};

// Rate limiter for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: "Too many requests, please try again later",
});

// Middleware to Authenticate User via JWT
const authenticateJWT = (roles = []) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  console.log(" Auth Header:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    console.log("Invalid or missing token");
    logAuthAttempt(req, false, "Unauthorized - No token provided");
    return res.status(401).json({ success: false, message: "Unauthorized - No token provided" });
  }

  const token = authHeader.split(" ")[1];

  if (await isTokenRevoked(token)) {
    logAuthAttempt(req, false, "Unauthorized - Token revoked");
    return res.status(401).json({ success: false, message: "Unauthorized - Token revoked" });
  }
  console.log("Checking if token is revoked:", token);
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing from environment variables!");
      return res.status(500).json({ success: false, message: "Server misconfiguration: Missing JWT secret" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("🔍 [middleware] decoded JWT payload:", decoded);
    console.log("🔍 decoded.userId:", decoded.userId, "typeof:", typeof decoded.userId);

    // Log the decoded token for debugging
    console.log("✅ decoded JWT payload:", decoded);
    // Check if decoded.userId is a number
    if (typeof decoded.userId  !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }

    console.log("🔍 Decoded userId from token:", decoded.userId);
    console.log("🔍 Type of decoded.userId:", typeof decoded.userId);

    const lookupId = Number(decoded.userId);
    console.log("🔍 Converted lookupId:", lookupId);



    // Attach full user details (excluding password) to the request
    const user = await User.findOne({ userId: decoded.userId }).select("-password");
    console.log("⬇️ [middleware] user record from DB:", user);
    console.log("⬇️   result of DB lookup:", user);

    if (!user) {
      console.error("User lookup failed:", decoded.userId);
      return res.status(401).json({ success: false, message: "Unauthorized - User not found" });
    }

    req.user = user;
    console.log("⬇️  user record from DB:", req.user);
    logAuthAttempt(req, true, "Authentication successful");

    if (roles.length && !roles.includes(decoded.role)) {
      logAuthAttempt(req, false, "Forbidden - Insufficient permissions");
      return res.status(403).json({ success: false, message: "Forbidden - Insufficient permissions" });
    }
    next();
    
  } catch (error) {
    console.error("Authentication Error:", error);
    const message = error.name === "TokenExpiredError" ? "Token expired. Please log in again." : "Invalid token";
    logAuthAttempt(req, false, message);
    return res.status(401).json({ success: false, message });
  }
};

// Middleware to Authenticate User via Session (Session ID-based)
const authenticateSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;  // Expect sessionId inside body, not Authorization

    if (!sessionId) {
      return res.status(401).json({ success: false, message: "Unauthorized - No session provided" });
    }

    const session = await Session.findOne({ sessionId });
    if (!session) {
      logAuthAttempt(req, false, "Invalid session");
      return res.status(401).json({ success: false, message: "Invalid session" });
    }

    if (Date.now() - session.lastAccessed > sessionExpiryTime) {
      logAuthAttempt(req, false, "Session expired. Please log in again.");
      return res.status(401).json({ success: false, message: "Session expired. Please log in again." });
    }

    await Session.updateOne({ sessionId }, { lastAccessed: Date.now() });
    req.user = { userId: session.userId }; // Better to unify structure
    logAuthAttempt(req, true, "Session authentication successful");
    next();
  } catch (error) {
    console.error("Session Authentication Error:", error);
    logAuthAttempt(req, false, "Session authentication failed");
    return res.status(500).json({ success: false, message: "Session authentication failed" });
  }
};

// Log authentication attempts
const logAuthAttempt = (req, success, message) => {
  if (process.env.NODE_ENV !== "production") {
    console.log({
      timestamp: new Date().toISOString(),
      ip: req.ip,
      method: req.method,
      path: req.path,
      success,
      message,
    });
  } else {
    console.log(`[${new Date().toISOString()}] Auth Attempt: ${message}`);
  }
};

const authenticateUser = (req, res, next) => {
  const token = req.header("Authorization")?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Access denied. Please log in first." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Log the decoded token for debugging
    console.log(decoded);
    req.user = decoded; // Attach user info to request
    // Check if decoded.userId is a number
    if (typeof decoded.userId !== 'number') {
      return res.status(400).json({ success: false, message: 'Invalid user ID format' });
    }
    next();
  } catch (error) {
    return res.status(403).json({ error: "Invalid or expired token." });
  }
};

// Clean up expired sessions periodically
const cleanupExpiredSessions = async (retryDelay = 10 * 60 * 1000) => {
  try {
    const expiredCount = await Session.countDocuments({ lastAccessed: { $lt: Date.now() - sessionExpiryTime } });
    if (expiredCount > 0) {
      const expiredSessions = await Session.deleteMany({ lastAccessed: { $lt: Date.now() - sessionExpiryTime } });
      console.log(`Cleaned up ${expiredSessions.deletedCount} expired sessions`);
    }
  } catch (error) {
    console.error("Session cleanup error:", error);
    const newDelay = Math.min(retryDelay * 2, 60 * 60 * 1000); // Max 1-hour delay
    setTimeout(() => cleanupExpiredSessions(newDelay), newDelay);
    // setTimeout(cleanupExpiredSessions, 10 * 60 * 1000); // Retry after 10 minutes
  }
};

// Run only if sessions exist
setInterval(async () => {
  try {
    const sessionCount = await Session.countDocuments({});
    if (sessionCount > 0) cleanupExpiredSessions();
  } catch (error) {
    console.error("Error checking session count:", error);
  }
}, 60 * 60 * 1000);

// Export authentication methods and rate limiter
module.exports = { authenticateJWT, authenticateSession, authLimiter, authenticateUser, isTokenRevoked};
