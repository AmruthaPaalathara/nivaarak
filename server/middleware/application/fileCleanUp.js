// fileCleanUp.js
const fs = require("fs");
const path = require("path");

const cleanupUploads = (req, res, next) => {
  res.locals.cleanupFiles = () => {
    if (req.files) {
      req.files.forEach((file) => {
        fs.unlink(file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      });
    }
  };
  next();
};

module.exports = cleanupUploads;