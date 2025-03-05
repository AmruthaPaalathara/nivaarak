const mongoose = require('mongoose');

const ApplicantSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    username: {  // Add username field
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});



const Applicant = mongoose.model('Applicant', ApplicantSchema);
module.exports = Applicant;