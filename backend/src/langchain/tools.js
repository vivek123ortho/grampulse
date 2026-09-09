// langchain/tools.js
//
// Each of these wraps a piece of business logic (DB queries, similarity math)
// as a LangChain Tool with a Zod input schema. The agent LLM reads each tool's
// name/description/schema and decides which ones to call and in what order —
// this is the actual "agentic" part: the control flow is not hardcoded by us.

const { DynamicStructuredTool } = require("@langchain/core/tools");
const { z } = require("zod");
const Report = require("../models/Report");
const CommunityIssue = require("../models/CommunityIssue");
const { isLikelyDuplicate } = require("../services/ai/similarityService");

const findSimilarReportsTool = new DynamicStructuredTool({
  name: "find_similar_reports",
  description:
    "Search for existing reports in the same village and category from the last 14 days that might describe the same underlying problem as a new report. Use this whenever a report could plausibly be a repeat of an existing issue (e.g. infrastructure problems like water, roads, electricity) rather than a one-off unrelated event.",
  schema: z.object({
    villageId: z.string(),
    category: z.string(),
    description: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    excludeReportId: z.string().optional(),
  }),
  func: async ({ villageId, category, description, latitude, longitude, excludeReportId }) => {
    const windowStart = new Date(Date.now() - 14 * 86_400_000);
    const candidates = await Report.find({
      villageId,
      category,
      createdAt: { $gte: windowStart },
      ...(excludeReportId ? { _id: { $ne: excludeReportId } } : {}),
    }).lean();

    let best = null;
    for (const candidate of candidates) {
      const result = await isLikelyDuplicate(
        { description, category, latitude, longitude },
        candidate
      );
      if (result.isMatch && (!best || result.score > best.score)) {
        best = { candidateReportId: String(candidate._id), communityIssueId: String(candidate.communityIssueId), ...result };
      }
    }

    return JSON.stringify(best || { isMatch: false, reason: "no candidates matched" });
  },
});

const calculateSeverityTool = new DynamicStructuredTool({
  name: "calculate_severity",
  description:
    "Combine an AI-assessed severity level with how many reports exist for an issue to produce a final severity score. Use this after determining whether a report belongs to a new or existing issue, to decide the issue's overall priority.",
  schema: z.object({
    aiSeverity: z.enum(["low", "medium", "high"]),
    reportCount: z.number().int().min(1),
  }),
  func: async ({ aiSeverity, reportCount }) => {
    const base = { low: 1, medium: 2, high: 3 }[aiSeverity] || 2;
    const volumeBoost = reportCount >= 10 ? 1 : reportCount >= 5 ? 0.5 : 0;
    const score = Math.min(3, base + volumeBoost);
    const severity = score >= 2.5 ? "high" : score >= 1.5 ? "medium" : "low";
    return JSON.stringify({ severity, score });
  },
});

const detectEmergingIssueTool = new DynamicStructuredTool({
  name: "detect_emerging_issue",
  description:
    "Given the timestamps of all reports tied to a community issue, determine whether the issue is 'emerging' — meaning reports are arriving unusually fast within a short recent window, suggesting a fast-growing problem that deserves early attention.",
  schema: z.object({
    reportTimestamps: z.array(z.string()).describe("ISO date strings of every report tied to this issue"),
  }),
  func: async ({ reportTimestamps }) => {
    const THRESHOLD = 3;
    const WINDOW_DAYS = 3;
    const windowStart = Date.now() - WINDOW_DAYS * 86_400_000;
    const recentCount = reportTimestamps.filter((t) => new Date(t).getTime() >= windowStart).length;
    return JSON.stringify({ emergingIssue: recentCount >= THRESHOLD, recentCount });
  },
});

const findResponsibleDepartmentTool = new DynamicStructuredTool({
  name: "find_responsible_department",
  description:
    "Look up which local government department is responsible for a given problem category, so the issue can be routed correctly.",
  schema: z.object({
    category: z.enum([
      "water",
      "roads",
      "electricity",
      "sanitation",
      "healthcare",
      "agriculture",
      "education",
      "other",
    ]),
  }),
  func: async ({ category }) => {
    const departmentMap = {
      water: "Public Health Engineering Department",
      roads: "Public Works Department",
      electricity: "State Electricity Board",
      sanitation: "Municipal Sanitation Department",
      healthcare: "District Health Office",
      agriculture: "Department of Agriculture",
      education: "District Education Office",
      other: "General Administration",
    };
    return departmentMap[category] || "General Administration";
  },
});

module.exports = {
  findSimilarReportsTool,
  calculateSeverityTool,
  detectEmergingIssueTool,
  findResponsibleDepartmentTool,
};
