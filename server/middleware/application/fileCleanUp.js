// fileCleanUp.js
const fs = require("fs");
const path = require("path");

const cleanupUploads = (req, res, next) => {
  if (!res) {
    console.warn("res is undefined in cleanupUploads middleware");
    return next();
  }

  res.locals = res.locals || {};

  res.locals.cleanupFiles = () => {
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) {
            console.error("Error deleting file:", err);
          }
        });
      });
    }
  };

  next();
};

module.exports = cleanupUploads;