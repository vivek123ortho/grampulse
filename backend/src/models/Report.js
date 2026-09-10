// models/Report.js
//
// A Report is ONE citizen's observation. Multiple related Reports get
// grouped into a single CommunityIssue by the AI agent (see CommunityIssue.js).
// Do not confuse the two — this is the core modeling decision of the whole project.

const mongoose = require("mongoose");

const CATEGORIES = [
  "water",
  "roads",
  "electricity",
  "sanitation",
  "healthcare",
  "agriculture",
  "education",
  "other",
];

const SEVERITIES = ["low", "medium", "high"];

const STATUSES = ["NEW", "VERIFIED", "ASSIGNED", "IN_PROGRESS", "RESOLVED", "ESCALATED"];

const reportSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    // Raw category selected by citizen at submission time (optional — AI
    // re-classifies in aiAnalysis.category, which is treated as authoritative
    // once available, but a fallback category is useful if AI classification fails)
    category: {
      type: String,
      enum: CATEGORIES,
      default: "other",
    },
    imageUrl: {
      type: String, // Cloudinary URL, set after Phase 2 image upload
    },
    voiceText: {
      type: String, // transcribed text if submitted via voice (Phase 2)
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },

    // Filled in by the AI agent (Phase 3+) — not required at creation time,
    // since a report is saved first, then analyzed asynchronously.
    aiAnalysis: {
      category: { type: String, enum: CATEGORIES },
      subcategory: { type: String },
      severity: { type: String, enum: SEVERITIES },
      confidence: { type: Number, min: 0, max: 1 },
      reasoning: { type: String },
      recommendedAction: { type: String },
      imageAnalysis: {
        detectedProblem: String,
        category: { type: String, enum: CATEGORIES },
        severity: { type: String, enum: SEVERITIES },
        potentialRisk: String,
        confidence: Number,
      },
    },

    severity: {
      type: String,
      enum: SEVERITIES,
      default: "medium",
    },
    status: {
      type: String,
      enum: STATUSES,
      default: "NEW",
    },

    // Set once the AI agent groups this report into a CommunityIssue (Phase 5)
    communityIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CommunityIssue",
    },
  },
  { timestamps: true }
);

// Reports are frequently queried by village + category + recency (for
// duplicate detection) and by user (for "my reports") — index accordingly.
reportSchema.index({ villageId: 1, category: 1, createdAt: -1 });
reportSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("Report", reportSchema);
module.exports.CATEGORIES = CATEGORIES;
module.exports.SEVERITIES = SEVERITIES;
module.exports.STATUSES = STATUSES;
