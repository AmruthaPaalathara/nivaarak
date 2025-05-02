// server/models/application/certificateApplicationSchema.js

const mongoose = require("mongoose");
const mime = require("mime-types");

const allowedFileTypes = ["application/pdf", "image/jpeg", "image/png"];

const eligibilitySchema = new mongoose.Schema(
    {
        applicant: {
            type: Number,
            ref: "User",
            required: [true, "Applicant userId is required"],
        },
        firstName: { type: String, required: true, trim: true },
        lastName: { type: String, required: true, trim: true },
        email: {
            type: String,
            required: true,
            lowercase: true,
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
        },
        phone: {
            type: String,
            required: true,
            match: [/^\\d{10}$/, "Enter a valid 10-digit phone number"],
        },

        documentType: {
            type: String,
            required: true, // or ObjectId to UserDocument if needed
        },

        files: {
            type: Map,
            of: [String], // { aadhaar: ["path1", "path2"] }
            validate: {
                validator: function (files) {
                    if (!(files instanceof Map)) return false;
                    for (const [_, fileArray] of files) {
                        for (const path of fileArray) {
                            const mimeType = mime.lookup(path);
                            if (!mimeType || !allowedFileTypes.includes(mimeType)) {
                                return false;
                            }
                        }
                    }
                    return true;
                },
                message: "Invalid file types.",
            },
        },

        extractedDetails: {
            type: Map,
            of: String, // { aadhaarName: "John", address: "Pune" }
            default: {},
        },

        emergencyLevel: {
            type: String,
            enum: ["Critical", "High", "Medium", "Low"],
            default: "Low",
        },

        requiredBy: { type: Date },

        agreementChecked: { type: Boolean, default: true },

        status: {
            type: String,
            enum: ["Pending", "Approved", "Rejected"],
            default: "Pending",
        },

        rejectionReason: {
            type: String,
            default: "",
        },

        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ["Pending", "Approved", "Rejected"],
                },
                changedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
    },
    { timestamps: true }
);

// Optional: Indexes for performance
eligibilitySchema.index({ applicant: 1 });
eligibilitySchema.index({ status: 1 });
eligibilitySchema.index({ documentType: 1 });

module.exports = mongoose.model("Eligibility", eligibilitySchema);
