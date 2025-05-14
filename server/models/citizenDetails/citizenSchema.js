const mongoose = require("mongoose");

const citizenSchema = new mongoose.Schema({
    first_name:    { type: String, required: true },
    last_name:     { type: String, required: true },
    father_name:   { type: String, required: true },
    mother_name:   { type: String, required: true },
    dob:           { type: String, required: true },  // "DD-MM-YYYY"
    aadharNumber:  { type: String, required: true, unique: true },
    panNumber:     { type: String, required: true, unique: true },
    address:       { type: String, required: true },
    email:         { type: String },
    phone:         { type: String },
}, { timestamps: true });

module.exports = mongoose.model("Citizen", citizenSchema);
