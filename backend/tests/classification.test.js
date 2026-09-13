// tests/classification.test.js
//
// Mocks the LangChain classification chain so these tests run fast, free,
// and deterministically — no real Groq API call needed. This tests OUR
// wiring logic (does the controller correctly apply the AI's response to
// the saved report?), not Groq's actual classification quality.

jest.mock("../src/langchain/chains", () => ({
  classifyReportChain: jest.fn(),
}));

const request = require("supertest");
const app = require("../src/app");
const Village = require("../src/models/Village");
const { classifyReportChain } = require("../src/langchain/chains");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";

async function registerCitizen() {
  const village = await Village.create({
    name: "Test Village",
    district: "Test District",
    state: "Test State",
    latitude: 19.0,
    longitude: 72.0,
  });

  const res = await request(app).post("/api/auth/register").send({
    name: "Test Citizen",
    email: `citizen-${Date.now()}-${Math.random()}@test.com`,
    password: "SecurePass123",
    villageId: village._id.toString(),
    role: "citizen",
  });

  return res.body.token;
}

describe("AI classification wiring", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("applies the AI's classification to a newly created report", async () => {
    classifyReportChain.mockResolvedValue({
      category: "water",
      subcategory: "water_quality",
      severity: "high",
      confidence: 0.91,
      reasoning: "Multiple indicators suggest possible water contamination.",
      recommendedAction: "Inspect the water source and conduct water-quality testing.",
      source: "ai",
    });

    const token = await registerCitizen();

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Handpump water smells bad and looks yellow",
        latitude: 19.05,
        longitude: 72.05,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.report.aiAnalysis.category).toBe("water");
    expect(res.body.report.aiAnalysis.subcategory).toBe("water_quality");
    expect(res.body.report.aiAnalysis.severity).toBe("high");
    expect(res.body.report.aiAnalysis.confidence).toBe(0.91);
    // The report's top-level severity should be overwritten by the AI's assessment
    expect(res.body.report.severity).toBe("high");
    expect(classifyReportChain).toHaveBeenCalledWith(
      "Handpump water smells bad and looks yellow"
    );
  });

  it("still saves the report with a safe fallback if the AI call fails", async () => {
    // Simulate classifyReportChain's own internal fallback behavior
    // (in real code it never throws — it catches internally — but we
    // simulate the fallback object it would return on failure)
    classifyReportChain.mockResolvedValue({
      category: "other",
      subcategory: "unclassified",
      severity: "medium",
      confidence: 0,
      reasoning: "AI classification unavailable — flagged for manual review.",
      recommendedAction: "Manual review required.",
      source: "fallback",
    });

    const token = await registerCitizen();

    const res = await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Something is wrong near the school",
        latitude: 19.0,
        longitude: 72.0,
      });

    // The report should still be created successfully — a failed AI call
    // must never block report submission
    expect(res.statusCode).toBe(201);
    expect(res.body.report.aiAnalysis.severity).toBe("medium");
    expect(res.body.report.aiAnalysis.confidence).toBe(0);
  });

  it("passes the raw description text to the classifier, not the fallback category field", async () => {
    classifyReportChain.mockResolvedValue({
      category: "roads",
      subcategory: "pothole",
      severity: "medium",
      confidence: 0.75,
      reasoning: "Report describes road surface damage.",
      recommendedAction: "Schedule road inspection.",
      source: "ai",
    });

    const token = await registerCitizen();

    await request(app)
      .post("/api/reports")
      .set("Authorization", `Bearer ${token}`)
      .send({
        description: "Big pothole near the bus stop",
        category: "water", // deliberately wrong citizen-picked category
        latitude: 19.0,
        longitude: 72.0,
      });

    // The AI should be called with the description text, independent of
    // whatever category the citizen happened to click
    expect(classifyReportChain).toHaveBeenCalledWith("Big pothole near the bus stop");
  });
});
