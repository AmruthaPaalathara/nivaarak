const path     = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const fs       = require("fs");
const csv      = require("csv-parser");
const mongoose = require("mongoose");
const Citizen  = require("../models/citizenDetails/citizenSchema");


async function seed() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("❌ MONGODB_URI not set in .env");
        process.exit(1);
    }

    console.log("Connecting to:", uri);
    await mongoose.connect(uri);

    const csvPath = path.resolve(
        __dirname,
        "../data/applicants_master2.csv"
    );
    console.log("Reading CSV from:", csvPath);

    // Strip BOM and trim all headers
    const stream = fs
        .createReadStream(csvPath)
        .pipe(csv({
            mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").trim()
        }));

    for await (const row of stream) {
        // Now row.first_name etc. should be defined
        const {
            first_name,
            last_name,
            father_name,
            mother_name,
            dob,
            aadhar_number,
            pan_number,
            address,
            email,
            phone,
        } = row;

        // Basic guard: skip if no aadhar
        if (!aadhar_number) {
            console.warn("Skipping row without Aadhaar:", row);
            continue;
        }

        await Citizen.updateOne(
            { aadharNumber: aadhar_number.trim() },
            {
                $set: {
                    first_name:   first_name.trim(),
                    last_name:    last_name.trim(),
                    father_name:  father_name.trim(),
                    mother_name:  mother_name.trim(),
                    dob:          dob.trim(),
                    aadharNumber: aadhar_number.trim(),
                    panNumber:    pan_number.trim(),
                    address:      address.trim(),
                    email:        email.trim().toLowerCase(),
                    phone:        phone.trim(),
                },
            },
            { upsert: true }
        );

        console.log("Seeded:", first_name.trim(), last_name.trim());
    }

    await mongoose.disconnect();
    console.log("✅ Seeding complete");
}

seed().catch((err) => {
    console.error("Seeding error:", err);
    process.exit(1);
});
