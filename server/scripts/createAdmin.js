// server/scripts/createAdmin.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const { User } = require("../models/authentication/userSchema"); // adjust if needed

dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb://localhost:27017/nivaarak", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

async function createAdmin() {
    try {
        const adminUser = new User({
            userId: 9999,
            username: "admin",
            email: "admin@nivaarak.com",
            password:"Admin@123",
            role: "admin",
            first_name: "System",
            last_name: "Admin",
            phone: "9999999999",
        });

        await adminUser.save();
        console.log("✅ Admin user created successfully");
    } catch (error) {
        console.error("❌ Error creating admin:", error.message || error);
    } finally {
        mongoose.connection.close();
    }
}

createAdmin();
