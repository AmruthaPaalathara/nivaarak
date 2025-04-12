const mongoose = require("mongoose");

// Connect to MongoDB
const connectToMongoDB = async () => {

    try {
      console.log("MongoDB URI:", process.env.MONGODB_URI);
      await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 15000,
        socketTimeoutMS: 45000,
      });
      console.log("Connected to MongoDB");
    } catch (err) {
      console.error("MongoDB Connection Error:", err);
      setTimeout(connectToMongoDB, 5000); // Retry after 5 seconds
    }
  };
  
  // Handle MongoDB connection events
  mongoose.connection.on("disconnected", () => {
    console.log("MongoDB Disconnected. Retrying connection...");
    setTimeout(connectToMongoDB, 5000); // Retry connection
  });
  
  module.exports = connectToMongoDB;