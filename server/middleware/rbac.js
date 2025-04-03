const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ success: false, error: "Forbidden: Admin access required." });
    }
  };
  
  const isUser = (req, res, next) => {
    if (req.user && req.user.role === "user") {
      next();
    } else {
      res.status(403).json({ success: false, error: "Forbidden: User access required." });
    }
  };
  
  module.exports = { isAdmin, isUser };