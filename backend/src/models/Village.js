// models/Village.js

const mongoose = require("mongoose");

const villageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    population: { type: Number, default: 0 },
    // healthScore is denormalized/cached here for fast dashboard reads —
    // recalculated periodically rather than computed live on every request
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Village", villageSchema);
