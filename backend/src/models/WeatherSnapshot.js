// models/WeatherSnapshot.js
//
// Cached weather readings per village, refreshed periodically. Used as an
// extra signal by the AI agent in Phase 6 (e.g. heavy rainfall + drainage
// reports -> flood risk note), not as a full weather-prediction system.

const mongoose = require("mongoose");

const weatherSnapshotSchema = new mongoose.Schema(
  {
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true,
    },
    temperature: { type: Number }, // Celsius
    rainfall: { type: Number }, // mm, last 24h
    humidity: { type: Number }, // %
    weatherCondition: { type: String }, // e.g. "Rain", "Clear", "Clouds"
    fetchedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

weatherSnapshotSchema.index({ villageId: 1, fetchedAt: -1 });

module.exports = mongoose.model("WeatherSnapshot", weatherSnapshotSchema);
