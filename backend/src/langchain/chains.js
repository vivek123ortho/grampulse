// langchain/chains.js
//
// Chains: PromptTemplate -> model.withStructuredOutput(schema).
// This replaces reportAnalyzer.js's manual prompt string + JSON.parse approach.
// LangChain's withStructuredOutput uses the model's native tool/function-calling
// under the hood, so the schema is enforced by the API itself, not just by
// asking nicely in the prompt text.

const { PromptTemplate } = require("@langchain/core/prompts");
const { HumanMessage } = require("@langchain/core/messages");
const { textModel, visionModel } = require("./models");
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

// Structured model: the schema is bound directly to the model call.
const structuredTextModel = textModel.withStructuredOutput(ReportClassificationSchema, {
  name: "classify_report",
});

/**
 * Classify a text report using the LangChain chain (prompt -> structured model).
 * Falls back to a safe default object if the call fails, so a failed AI call
 * never blocks a report from being saved.
 */
async function classifyReportChain(reportText) {
  try {
    const formattedPrompt = await classificationPrompt.format({ reportText });
    const result = await structuredTextModel.invoke(formattedPrompt);
    return { ...result, source: "ai" };
  } catch (err) {
    console.error("[chains] classifyReportChain failed, using fallback:", err.message);
    return {
      category: "other",
      subcategory: "unclassified",
      severity: "medium",
      confidence: 0,
      reasoning: "AI classification unavailable — flagged for manual review.",
      recommendedAction: "Manual review required.",
      source: "fallback",
    };
  }
}

const structuredVisionModel = visionModel.withStructuredOutput(ImageAnalysisSchema, {
  name: "analyze_image",
});

/**
 * Analyze an uploaded image (base64, no data: prefix) using the vision model.
 */
async function analyzeImageChain(base64Image, mimeType) {
  try {
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
    const result = await structuredVisionModel.invoke([message]);
    return { ...result, source: "ai" };
  } catch (err) {
    console.error("[chains] analyzeImageChain failed, using fallback:", err.message);
    return {
      detectedProblem: "Unable to analyze image",
      category: "other",
      severity: "medium",
      potentialRisk: "",
      confidence: 0,
      source: "fallback",
    };
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
    const formattedPrompt = await escalationPrompt.format({
      category: issue.category,
      severity: issue.severity,
      reportCount: issue.reportIds?.length ?? 0,
      firstReportedAt: issue.firstReportedAt,
      daysUnresolved: issue.daysUnresolved ?? "unknown",
      description: issue.description,
    });
    const result = await textModel.invoke(formattedPrompt);
    return result.content;
  } catch (err) {
    console.error("[chains] generateEscalationSummaryChain failed:", err.message);
    return `Escalation summary unavailable. Issue category: ${issue.category}, severity: ${issue.severity}, ${issue.reportIds?.length ?? 0} reports, unresolved ${issue.daysUnresolved ?? "unknown"} days.`;
  }
}

module.exports = { classifyReportChain, analyzeImageChain, generateEscalationSummaryChain };
