// services/ai/reportAnalyzer.js
//
// Turns raw citizen report text into a validated, structured classification.
// CRITICAL: never save the model's raw output straight to the database.
// Always parse + validate against an allow-list first — LLMs occasionally
// drift from the requested schema, add markdown fences, or invent new fields.

const { generateText, generateFromImage } = require("./geminiService");
const {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  buildReportClassificationPrompt,
  buildImageAnalysisPrompt,
} = require("./promptBuilder");

/**
 * Strip markdown code fences if the model added them despite instructions not to.
 */
function stripCodeFences(text) {
  return text.replace(/^```json\s*/i, "").replace(/```$/, "").trim();
}

/**
 * Validate a parsed classification object against our allowed values.
 * Throws if the shape is unusable; falls back to safe defaults for
 * missing/soft fields where possible.
 */
function validateClassification(obj) {
  if (!obj || typeof obj !== "object") {
    throw new Error("AI classification response was not an object");
  }

  if (!VALID_CATEGORIES.includes(obj.category)) {
    throw new Error(`AI returned invalid category: ${obj.category}`);
  }

  if (!VALID_SEVERITIES.includes(obj.severity)) {
    throw new Error(`AI returned invalid severity: ${obj.severity}`);
  }

  const confidence = Number(obj.confidence);
  if (Number.isNaN(confidence) || confidence < 0 || confidence > 1) {
    throw new Error(`AI returned invalid confidence: ${obj.confidence}`);
  }

  return {
    category: obj.category,
    subcategory: typeof obj.subcategory === "string" ? obj.subcategory : "general",
    severity: obj.severity,
    confidence,
    reasoning: typeof obj.reasoning === "string" ? obj.reasoning : "",
    recommendedAction:
      typeof obj.recommendedAction === "string" ? obj.recommendedAction : "",
  };
}

/**
 * Classify a text report. Returns a validated object ready to store on Report.aiAnalysis.
 * On failure, returns a safe fallback rather than throwing — a report should never
 * be lost just because the AI call failed.
 */
async function classifyReport(reportText) {
  try {
    const prompt = buildReportClassificationPrompt(reportText);
    const raw = await generateText(prompt, { jsonMode: true });
    const parsed = JSON.parse(stripCodeFences(raw));
    return { ...validateClassification(parsed), source: "ai" };
  } catch (err) {
    console.error("[reportAnalyzer] classifyReport failed, using fallback:", err.message);
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

/**
 * Analyze an uploaded image. base64Image should be raw base64 (no data: prefix).
 */
async function analyzeImage(base64Image, mimeType) {
  try {
    const prompt = buildImageAnalysisPrompt();
    const raw = await generateFromImage(base64Image, mimeType, prompt);
    const parsed = JSON.parse(stripCodeFences(raw));

    if (!VALID_CATEGORIES.includes(parsed.category)) {
      throw new Error(`AI returned invalid category: ${parsed.category}`);
    }
    if (!VALID_SEVERITIES.includes(parsed.severity)) {
      throw new Error(`AI returned invalid severity: ${parsed.severity}`);
    }

    return {
      detectedProblem: String(parsed.detectedProblem || "Unclear"),
      category: parsed.category,
      severity: parsed.severity,
      potentialRisk: String(parsed.potentialRisk || ""),
      confidence: Number(parsed.confidence) || 0,
      source: "ai",
    };
  } catch (err) {
    console.error("[reportAnalyzer] analyzeImage failed, using fallback:", err.message);
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

module.exports = { classifyReport, analyzeImage };
