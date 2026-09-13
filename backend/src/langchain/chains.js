// langchain/chains.js
//
// Chains: PromptTemplate -> model.withStructuredOutput(schema).
// This replaces reportAnalyzer.js's manual prompt string + JSON.parse approach.
// LangChain's withStructuredOutput uses the model's native tool/function-calling
// under the hood, so the schema is enforced by the API itself, not just by
// asking nicely in the prompt text.
//
// IMPORTANT: models are fetched lazily via getTextModel()/getVisionModel()
// INSIDE each function call, not at the top of this file. If we called
// getTextModel() at import time, a missing GROQ_API_KEY would throw the
// moment this file is required (e.g. when the server boots), crashing the
// whole app before it starts. Fetching lazily means a missing key only
// affects the one request that needed it — it gets caught below and
// degrades to the fallback object instead.

const { PromptTemplate } = require("@langchain/core/prompts");
const { HumanMessage } = require("@langchain/core/messages");
const { getTextModel, getVisionModel } = require("./models");
const { ReportClassificationSchema, ImageAnalysisSchema } = require("./schemas");

const classificationPrompt = PromptTemplate.fromTemplate(`You are an assistant that classifies rural infrastructure problem reports.

A villager submitted this report:
"""
{reportText}
"""

Classify it carefully.

Important rules:
- Never claim something is DEFINITELY dangerous or contaminated — use words like "possible" or "potential".
- Never make medical claims.
- Never claim a government authority has already been notified.
- If the text is too vague to classify confidently, still give your best guess but lower the confidence value.`);

const CLASSIFICATION_FALLBACK = {
  category: "other",
  subcategory: "unclassified",
  severity: "medium",
  confidence: 0,
  reasoning: "AI classification unavailable — flagged for manual review.",
  recommendedAction: "Manual review required.",
  source: "fallback",
};

/**
 * Classify a text report using the LangChain chain (prompt -> structured model).
 * Falls back to a safe default object if the call fails for ANY reason
 * (missing API key, network error, rate limit, malformed response) — a
 * failed AI call must never block a report from being saved.
 */
async function classifyReportChain(reportText) {
  try {
    const model = getTextModel().withStructuredOutput(ReportClassificationSchema, {
      name: "classify_report",
    });
    const formattedPrompt = await classificationPrompt.format({ reportText });
    const result = await model.invoke(formattedPrompt);
    return { ...result, source: "ai" };
  } catch (err) {
    console.error("[chains] classifyReportChain failed, using fallback:", err.message);
    return { ...CLASSIFICATION_FALLBACK };
  }
}

const IMAGE_ANALYSIS_FALLBACK = {
  detectedProblem: "Unable to analyze image",
  category: "other",
  severity: "medium",
  potentialRisk: "",
  confidence: 0,
  source: "fallback",
};

/**
 * Analyze an uploaded image (base64, no data: prefix) using the vision model.
 */
async function analyzeImageChain(base64Image, mimeType) {
  try {
    const model = getVisionModel().withStructuredOutput(ImageAnalysisSchema, {
      name: "analyze_image",
    });
    const message = new HumanMessage({
      content: [
        {
          type: "text",
          text: "Analyze this photo submitted as part of a rural infrastructure problem report. This is an AI-generated assessment, not a verified fact — phrase potentialRisk as a possibility, never a certainty. Never make medical claims.",
        },
        {
          type: "image_url",
          image_url: `data:${mimeType};base64,${base64Image}`,
        },
      ],
    });
    const result = await model.invoke([message]);
    return { ...result, source: "ai" };
  } catch (err) {
    console.error("[chains] analyzeImageChain failed, using fallback:", err.message);
    return { ...IMAGE_ANALYSIS_FALLBACK };
  }
}

// Plain-text chain (no structured schema needed) for escalation summaries.
const escalationPrompt = PromptTemplate.fromTemplate(`You are drafting a short internal summary for a rural community issue that needs escalation to a higher authority.

Issue details:
- Category: {category}
- Severity: {severity}
- Number of reports: {reportCount}
- First reported: {firstReportedAt}
- Days unresolved: {daysUnresolved}
- Description: {description}

Write a 3-4 sentence factual summary suitable for handing to a district officer. Do not invent facts not given above. Respond as plain text, no markdown.`);

async function generateEscalationSummaryChain(issue) {
  try {
    const model = getTextModel();
    const formattedPrompt = await escalationPrompt.format({
      category: issue.category,
      severity: issue.severity,
      reportCount: issue.reportIds?.length ?? 0,
      firstReportedAt: issue.firstReportedAt,
      daysUnresolved: issue.daysUnresolved ?? "unknown",
      description: issue.description,
    });
    const result = await model.invoke(formattedPrompt);
    return result.content;
  } catch (err) {
    console.error("[chains] generateEscalationSummaryChain failed:", err.message);
    return `Escalation summary unavailable. Issue category: ${issue.category}, severity: ${issue.severity}, ${issue.reportIds?.length ?? 0} reports, unresolved ${issue.daysUnresolved ?? "unknown"} days.`;
  }
}

module.exports = { classifyReportChain, analyzeImageChain, generateEscalationSummaryChain };

