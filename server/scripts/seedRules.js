const path= require('path');
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const mongoose      = require('mongoose');
const DocumentRule  = require('../models/verification/DocumentRule');
const rules         = require('../data/documentData.json');

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to MongoDB, seeding rules...');

        for (let [docType, cfg] of Object.entries(rules)) {
            await DocumentRule.findOneAndUpdate(
                { docType },
                { requiredDocs: cfg },
                { upsert: true }
            );
            console.log(`Seeded rule for: ${docType}`);
        }

        console.log('All rules seeded.');
        await mongoose.disconnect();
        process.exit(0);
    } catch (err) {
        console.error('Seeding error:', err);
        process.exit(1);
    }
}

seed();