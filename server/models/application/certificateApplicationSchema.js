const mongoose = require("mongoose");
const path = require("path");
const mime = require("mime-types");

// Allowed file types
const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

const certificateApplicationSchema = new mongoose.Schema(
  {
    applicant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // Reference to the User model
      required: [true, "User ID is required"],
    },
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
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

    // Dynamic file storage using a Map
    files: {
      type: Map,
      of: String, // Stores { filename: file path }
      validate: {
        validator: function (files) {
          for (const [key, value] of files) {
            const mimeType = mime.lookup(value); 
            if (!mimeType || !allowedFileTypes.includes(mimeType)) {
              return false;
            }            
          }
          return true;
        },
        message: "Invalid file type. Only PDF, JPEG, and PNG are allowed.",
      },
    },

    agreementChecked: {
      type: Boolean,
      required: [true, "You must agree to the terms and conditions"],
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
      immutable:true,
    },
  },
  { timestamps: true }
);

// Indexes for frequently queried fields
certificateApplicationSchema.index({ email: 1 }); // Index on email
certificateApplicationSchema.index({ status: 1 }); // Index on status
certificateApplicationSchema.index({ user: 1 });


// Export the model
module.exports = mongoose.model("Certificate", certificateApplicationSchema);