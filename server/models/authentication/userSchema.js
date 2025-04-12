const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  sequence_value: { type: Number, default: 0 },
});

const Counter = mongoose.model("Counter", counterSchema);

const userSchema = new mongoose.Schema(
  {
    userId: { type: Number, unique: true },

    first_name: { type: String, required: true, trim: true },
    last_name: { type: String, required: true, trim: true },
    username: {
      type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 20,
      match: [/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
      match: [/^\d{10}$/, "Phone number must be 10 digits"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
    accountStatus: {
      type: String,
      enum: ["active", "suspended", "deleted"],
      default: "active",
    },
    profilePicture: {
      type: String,
      default: "https://example.com/default-profile-picture.jpg",
    },
  },
  { timestamps: true }
);

// Hash Password Before Saving
userSchema.pre("save", async function (next) {
  try {
    if (!this.userId) {
      const counter = await Counter.findByIdAndUpdate(
        "userId",
        { $inc: { sequence_value: 1 } },
        { new: true, upsert: true }
      );
      this.userId = counter.sequence_value;
    }

    if (this.password && this.isModified("password")) {
        console.log("Password before hashing:", this.password);

        const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
        console.log("Password after hashing:", this.password);


    }

    next();
  } catch (error) {
    next(error);
  }
});


// Compare Password for Login
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error("Password comparison error:", error);
    return false;
  }
};



module.exports = { User: mongoose.model("User", userSchema), Counter };