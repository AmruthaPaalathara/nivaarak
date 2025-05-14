const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    docType: { type: String, unique: true, required: true },
    // e.g. { identity_proof: [...], address_proof: [...], age_proof: [...] }
    requiredDocs: {
        type: Map,
        of: [String],
        required: true
    }
});

module.exports = mongoose.model('DocumentRule', ruleSchema);