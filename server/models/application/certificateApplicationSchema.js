const mongoose = require("mongoose");
const path = require("path");
const mime = require("mime-types");
const User = require("../authentication/userSchema");
const Certificate = require("../../models/application/certificateApplicationSchema");


// Allowed file types
const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

const certificateApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: Number,
      ref: "User", // Reference to the User model
      required: [true, "User ID is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
        match: [/^[A-Za-z\s]+$/, "Name must contain only letters"]

    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
        match: [/^[A-Za-z\s]+$/, "Name must contain only letters"]

    },
    email: {
      type: String,
      required: [true, "Email is required"],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      match: [/^\d{10}$/, "Please enter a valid 10-digit phone number"],
    },
    state: {
      type: String,
      default: "Maharashtra",
      immutable: true, // Cannot be changed after creation
    },

    documentType: {
      type: String,
      ref: "UserDocument", // Reference to UserDocument schema
      required: true,
    },

    // Dynamic file storage using a Map
    files: {
      type: Map,
      of: [String], // Stores { filename: file path }
      validate: {
        validator: function (files) {
            if (!(files instanceof Map)) return false;
            for (const [key, fileArray] of files) {
                if (!Array.isArray(fileArray)) return false;
                for (const filePath of fileArray) {
                    const mimeType = mime.lookup(filePath);
                    if (!mimeType || !allowedFileTypes.includes(mimeType)) {
                        return false;
                    }
                }
            }
            return true;
        },
        message: "Invalid file type. Only PDF is allowed.",
      },
    },
      flatFiles: {
          type: [String],
          default: [],
      },      extractedDetails: {
          type: Map,
          of: String, // or Object if the structure is complex
          default: {},
      },
    agreementChecked: {
      type: Boolean,
      required: [true, "You must agree to the terms and conditions"],
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",

    },
      rejectionReason: {
          type: String,
          default: "",
      },
      statusHistory: {
          type: [
              {
                  status: {
                      type: String,
                      enum: ["Pending", "Approved", "Rejected"],
                  },
                  changedAt: {
                      type: Date,
                      default: Date.now,
                  },
              }
          ],
          default: [],
      }

  },
  { timestamps: true }
);

certificateApplicationSchema.pre("save", function (next) {
    if (!Array.isArray(this.statusHistory)) {
        this.statusHistory = [];
    }
    next();
});



// Indexes for frequently queried fields
certificateApplicationSchema.index({ email: 1 }); // Index on email
certificateApplicationSchema.index({ status: 1 }); // Index on status
certificateApplicationSchema.index({ applicant: 1 });


// Export the model
module.exports = mongoose.model("Certificate", certificateApplicationSchema);