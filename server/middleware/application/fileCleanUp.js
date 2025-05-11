const fs = require("fs");
const path = require("path");

const cleanupUploads = (req, res, next) => {
  res.locals = res.locals || {};

  res.locals.cleanupFiles = () => {
    try {
      if (req.files) {
        const filesArray = Array.isArray(req.files)
            ? req.files
            : Object.values(req.files).flat();

        filesArray.forEach((file) => {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.error(`❌ Failed to delete file ${file.path}:`, err);
            } else {
              console.log(`🧹 Deleted file: ${file.path}`);
            }
          });
        });
      }
    } catch (e) {
      console.error("❗ Error during file cleanup:", e);
    }
  };

  next();
};

module.exports = cleanupUploads;
