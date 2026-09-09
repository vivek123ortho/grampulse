// services/ai/promptBuilder.js
//
// Keeping prompts here (separate from the logic that calls the API) makes them
// easy to tune without touching business logic, and easy to show in a demo/README.

const VALID_CATEGORIES = [
  "water",
  "roads",
  "electricity",
  "sanitation",
  "healthcare",
  "agriculture",
  "education",
  "other",
];

const VALID_SEVERITIES = ["low", "medium", "high"];

function buildReportClassificationPrompt(reportText) {
  return `You are an assistant that classifies rural infrastructure problem reports.

A villager submitted this report:
"""
${reportText}
"""

Classify it and respond with ONLY valid JSON, no markdown fences, no extra text, matching exactly this shape:

{
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "subcategory": a short specific label (e.g. "water_quality", "pothole", "power_outage"),
  "severity": one of ${JSON.stringify(VALID_SEVERITIES)},
  "confidence": a number between 0 and 1,
  "reasoning": one sentence explaining the classification,
  "recommendedAction": one sentence, phrased as a suggestion (e.g. "Inspect the water source"), never a certainty
}

Important rules:
- Never claim something is DEFINITELY dangerous or contaminated — use words like "possible" or "potential".
- Never make medical claims.
- Never claim a government authority has been notified.
- If the text is too vague to classify confidently, still return your best guess but lower the confidence value.`;
}

function buildImageAnalysisPrompt() {
  return `You are analyzing a photo submitted as part of a rural infrastructure problem report.

Look at the image and respond with ONLY valid JSON, no markdown fences, no extra text, matching exactly this shape:

{
  "detectedProblem": a short phrase describing what the image shows (e.g. "Road damage / pothole"),
  "category": one of ${JSON.stringify(VALID_CATEGORIES)},
  "severity": one of ${JSON.stringify(VALID_SEVERITIES)},
  "potentialRisk": one short phrase (e.g. "Vehicle accident risk"),
  "confidence": a number between 0 and 1
}

Important rules:
- This is an AI-generated assessment, not a verified fact — phrase potentialRisk as a possibility, not a certainty.
- Never make medical claims from the image.
- If the image is unclear or doesn't show an obvious infrastructure issue, say so via a low confidence value.`;
}

function buildEscalationSummaryPrompt(issue) {
  return `You are drafting a short internal summary for a rural community issue that needs escalation to a higher authority.

Issue details:
- Category: ${issue.category}
- Severity: ${issue.severity}
- Number of reports: ${issue.reportIds?.length ?? 0}
- First reported: ${issue.firstReportedAt}
- Days unresolved: ${issue.daysUnresolved ?? "unknown"}
- Description: ${issue.description}

Write a 3-4 sentence factual summary suitable for handing to a district officer. Do not invent facts not given above.
Respond as plain text (not JSON), no markdown formatting.`;
}

module.exports = {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  buildReportClassificationPrompt,
  buildImageAnalysisPrompt,
  buildEscalationSummaryPrompt,
};
