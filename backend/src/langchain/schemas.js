// langchain/schemas.js
//
// Zod schemas define the exact shape we require from the LLM. Passed into
// `withStructuredOutput()`, LangChain handles prompting the model to comply
// AND validating/parsing the response — this replaces our old hand-written
// stripCodeFences + JSON.parse + manual field-checking logic.

const { z } = require("zod");

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

const ReportClassificationSchema = z.object({
  category: z.enum(VALID_CATEGORIES).describe("Best-matching problem category"),
  subcategory: z
    .string()
    .describe('Short specific label, e.g. "water_quality" or "pothole"'),
  severity: z.enum(VALID_SEVERITIES),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().describe("One sentence explaining the classification"),
  recommendedAction: z
    .string()
    .describe('Suggestion phrased as a possibility, e.g. "Inspect the water source"'),
});

const ImageAnalysisSchema = z.object({
  detectedProblem: z.string().describe('e.g. "Road damage / pothole"'),
  category: z.enum(VALID_CATEGORIES),
  severity: z.enum(VALID_SEVERITIES),
  potentialRisk: z.string().describe('e.g. "Vehicle accident risk", phrased as a possibility'),
  confidence: z.number().min(0).max(1),
});

module.exports = {
  VALID_CATEGORIES,
  VALID_SEVERITIES,
  ReportClassificationSchema,
  ImageAnalysisSchema,
};
