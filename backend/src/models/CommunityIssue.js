// models/CommunityIssue.js
//
// A CommunityIssue is formed when multiple Reports are judged similar
// enough (same category, nearby location, similar description) by the
// AI agent's duplicate-detection logic. This is the entity that village
// representatives and admins actually act on — not individual Reports.

const mongoose = require("mongoose");
const { CATEGORIES, SEVERITIES, STATUSES } = require("./Report");

const communityIssueSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true },
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      required: true,
    },
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
    severity: { type: String, enum: SEVERITIES, default: "medium" },

    // All Report documents that have been merged into this issue
    reportIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Report",
      },
    ],

    // Simple proxy for now: number of distinct reports. Could later be
    // refined with population-density estimates per village.
    affectedPeople: { type: Number, default: 1 },

    status: {
      type: String,
      enum: STATUSES,
      default: "NEW",
    },

    // Set once Phase 6's detectEmergingIssue() logic flags rapid report growth
    emergingIssue: { type: Boolean, default: false },

    aiRecommendation: { type: String },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    resolutionNotes: { type: String },

    firstReportedAt: { type: Date, required: true },
    lastReportedAt: { type: Date, required: true },

    // Bumped by the Phase 9 autonomous escalation cron job
    escalationLevel: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

communityIssueSchema.index({ villageId: 1, status: 1 });
communityIssueSchema.index({ severity: 1, status: 1 });

module.exports = mongoose.model("CommunityIssue", communityIssueSchema);
