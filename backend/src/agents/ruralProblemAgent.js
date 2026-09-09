// agents/ruralProblemAgent.js
//
// This is the "agent" layer: given a new report, it decides which tools
// are relevant and runs them in the right order, producing one final
// result object. Controllers should call ONLY this file, never the
// individual services directly — that keeps the orchestration logic in
// one place and testable.
//
// NOTE on "agentic" design: a fully autonomous LLM-driven tool-selector
// (where the model itself decides which function to call, via function-
// calling) is the "purest" version of this. The version below uses
// explicit conditional logic to decide the workflow, which is easier to
// debug and demo reliably — but the AI still does all the actual
// reasoning (classification, similarity judgment, recommendation).
// If you want to upgrade to true LLM-driven tool selection later, swap
// the `runWorkflow` function body for a Gemini function-calling loop
// and keep every tool function below unchanged.

const { classifyReport, analyzeImage } = require("../services/ai/reportAnalyzer");
const { isLikelyDuplicate } = require("../services/ai/similarityService");
const Report = require("../models/Report");
const CommunityIssue = require("../models/CommunityIssue");

const EMERGING_ISSUE_REPORT_THRESHOLD = 3;
const EMERGING_ISSUE_WINDOW_DAYS = 3;

/**
 * Tool: find existing reports in the same village/category from the last N days
 * that could be candidates for merging.
 */
async function findCandidateReports(newReportDoc) {
  const windowStart = new Date(Date.now() - 14 * 86_400_000);
  return Report.find({
    villageId: newReportDoc.villageId,
    category: newReportDoc.aiAnalysis.category,
    createdAt: { $gte: windowStart },
    _id: { $ne: newReportDoc._id },
  }).lean();
}

/**
 * Tool: given a set of candidate reports, find the best duplicate match (if any).
 */
async function findSimilarReports(newReportDoc, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const result = await isLikelyDuplicate(newReportDoc, candidate);
    if (result.isMatch && (!best || result.score > best.score)) {
      best = { candidate, ...result };
    }
  }
  return best;
}

/**
 * Tool: decide whether a set of merged reports counts as an "emerging issue" —
 * i.e. reports arriving faster than normal within a short window.
 */
function detectEmergingIssue(reportIds, reportTimestamps) {
  const windowStart = Date.now() - EMERGING_ISSUE_WINDOW_DAYS * 86_400_000;
  const recentCount = reportTimestamps.filter((t) => new Date(t).getTime() >= windowStart).length;
  return recentCount >= EMERGING_ISSUE_REPORT_THRESHOLD;
}

/**
 * Tool: combine AI severity + report volume into a final severity/priority score.
 * Simple, explainable rule-based blend — deliberately NOT another AI call,
 * so it's fast, free, and predictable. This is a good example of "use AI only
 * where it adds value" — pure arithmetic doesn't need an LLM.
 */
function calculateSeverity(aiSeverity, reportCount) {
  const base = { low: 1, medium: 2, high: 3 }[aiSeverity] || 2;
  const volumeBoost = reportCount >= 10 ? 1 : reportCount >= 5 ? 0.5 : 0;
  const score = Math.min(3, base + volumeBoost);
  if (score >= 2.5) return "high";
  if (score >= 1.5) return "medium";
  return "low";
}

/**
 * Main entry point: given a freshly-saved Report document (with imageBase64
 * optionally attached), run the full agent workflow and return the outcome.
 *
 * @param {object} newReportDoc - Mongoose Report document, already saved with a basic status
 * @param {object} [options]
 * @param {string} [options.imageBase64]
 * @param {string} [options.imageMimeType]
 * @returns {Promise<{ report: object, communityIssue: object, isNewIssue: boolean }>}
 */
async function runWorkflow(newReportDoc, options = {}) {
  // Step 1: classify the text (always runs)
  const textAnalysis = await classifyReport(newReportDoc.description);

  // Step 2: analyze image only if one was provided — this is the agent
  // "deciding" a tool is relevant based on input, rather than always running it
  let imageAnalysis = null;
  if (options.imageBase64) {
    imageAnalysis = await analyzeImage(options.imageBase64, options.imageMimeType);
  }

  // Merge text + image analysis: if image suggests higher severity, trust it
  const severityRank = { low: 1, medium: 2, high: 3 };
  const finalSeverityGuess =
    imageAnalysis && severityRank[imageAnalysis.severity] > severityRank[textAnalysis.severity]
      ? imageAnalysis.severity
      : textAnalysis.severity;

  newReportDoc.aiAnalysis = {
    category: textAnalysis.category,
    subcategory: textAnalysis.subcategory,
    severity: finalSeverityGuess,
    confidence: textAnalysis.confidence,
    reasoning: textAnalysis.reasoning,
    recommendedAction: textAnalysis.recommendedAction,
    imageAnalysis: imageAnalysis || undefined,
  };
  await newReportDoc.save();

  // Step 3: find candidate reports and check for a duplicate/merge match
  const candidates = await findCandidateReports(newReportDoc);
  const match = candidates.length > 0 ? await findSimilarReports(newReportDoc, candidates) : null;

  let communityIssue;
  let isNewIssue = false;

  if (match && match.candidate.communityIssueId) {
    // Merge into existing issue
    communityIssue = await CommunityIssue.findById(match.candidate.communityIssueId);
    communityIssue.reportIds.push(newReportDoc._id);
    communityIssue.lastReportedAt = new Date();
  } else {
    // Create a new issue (possibly starting from just this one report)
    isNewIssue = true;
    communityIssue = await CommunityIssue.create({
      title: `${newReportDoc.aiAnalysis.subcategory} issue`,
      description: newReportDoc.description,
      category: newReportDoc.aiAnalysis.category,
      villageId: newReportDoc.villageId,
      latitude: newReportDoc.latitude,
      longitude: newReportDoc.longitude,
      severity: newReportDoc.aiAnalysis.severity,
      reportIds: [newReportDoc._id],
      status: "NEW",
      firstReportedAt: new Date(),
      lastReportedAt: new Date(),
      escalationLevel: 0,
    });
  }

  newReportDoc.communityIssueId = communityIssue._id;
  await newReportDoc.save();

  // Step 4: recompute severity + emerging-issue flag across ALL reports in the issue now
  const allReports = await Report.find({ communityIssueId: communityIssue._id }).lean();
  const timestamps = allReports.map((r) => r.createdAt);

  communityIssue.severity = calculateSeverity(newReportDoc.aiAnalysis.severity, allReports.length);
  communityIssue.emergingIssue = detectEmergingIssue(communityIssue.reportIds, timestamps);
  communityIssue.affectedPeople = allReports.length; // simple proxy; refine later
  await communityIssue.save();

  return { report: newReportDoc, communityIssue, isNewIssue };
}

module.exports = { runWorkflow, calculateSeverity, detectEmergingIssue };
