const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const ApplicantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {  
        type: String,
        required: true,
        unique: true  // Ensure username is unique
    },
    email: {
        type: String,
        required: true,
        unique: true  // Ensure email is unique
    },
    password: {
        type: String,
        required: true
    }
});

// Hash password before saving to the database
ApplicantSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();
    
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

const Applicant = mongoose.model("Applicant", ApplicantSchema);
module.exports = Applicant;
