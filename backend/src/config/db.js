// config/db.js
// this is basically mongodb connection room
// Single place to connect to MongoDB. Import and call connectDB() once
// from server.js at startup — nothing else should call mongoose.connect().

const mongoose = require("mongoose");

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not set in .env");
  }

  try {
    await mongoose.connect(uri);
    console.log(`[db] Connected to MongoDB: ${mongoose.connection.name}`);
  } catch (err) {
    console.error("[db] MongoDB connection failed:", err.message);
    process.exit(1);
  }

  mongoose.connection.on("error", (err) => {
    console.error("[db] MongoDB runtime error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[db] MongoDB disconnected");
  });
}

module.exports = connectDB;
