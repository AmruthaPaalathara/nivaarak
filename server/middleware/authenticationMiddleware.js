const jwt = require("jsonwebtoken");
const { User } = require("../models/authentication/userSchema");

const isAuthenticated = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ success: false, error: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const userId = parseInt(decoded.userId);

    if (isNaN(userId)) {
      return res.status(400).json({ success: false, error: "Invalid userId in token" });
    }

    const user = await User.findOne({ userId }); //  'id' should match userId field in DB

    if (!user) {
      console.log("User NOT FOUND in DB");
      return res.status(401).json({ message: "Invalid token" });
    }

    req.user = {
      userId: user.userId, //  This gets attached
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({ success: false, error: "Unauthorized: Invalid token." });
  }
};

module.exports = isAuthenticated;