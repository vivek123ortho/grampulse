// langchain/ruralProblemAgentExecutor.js
//
// This is the true "agentic" upgrade from Phase 7: instead of our hand-written
// if/else in agents/ruralProblemAgent.js, we hand the LLM a list of tools and
// let IT decide which ones to call, in what order, based on the report content.
//
// Example of the difference:
//   Hardcoded version: ALWAYS calls findSimilarReports for every report.
//   Agent version: the LLM might skip that tool entirely for a report like
//   "a stray dog is loose near the school" (clearly a one-off, unlikely to
//   have duplicates worth merging), but always call it for water/road reports.
//
// Install: npm install langchain @langchain/core

const { AgentExecutor, createToolCallingAgent } = require("langchain/agents");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const { getTextModel } = require("./models");
const {
  findSimilarReportsTool,
  calculateSeverityTool,
  detectEmergingIssueTool,
  findResponsibleDepartmentTool,
} = require("./tools");
const { classifyReportChain, analyzeImageChain } = require("./chains");
const Report = require("../models/Report");
const CommunityIssue = require("../models/CommunityIssue");

const tools = [
  findSimilarReportsTool,
  calculateSeverityTool,
  detectEmergingIssueTool,
  findResponsibleDepartmentTool,
];

const agentPrompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You are the GramPulse Rural Problem Agent. You have already been given a
classification (category, severity) for a new citizen report. Your job is to
decide which of your available tools are relevant to fully process this report,
call them in a sensible order, and finish with a short plain-text summary of
what you concluded and which department it should be routed to.

Guidelines:
- Only call find_similar_reports if the category is one where duplicates are
  plausible (water, roads, electricity, sanitation, agriculture). Skip it for
  clearly one-off categories if it doesn't make sense.
- Always call find_responsible_department once you know the category.
- Only call calculate_severity and detect_emerging_issue if you found related
  reports (i.e. this could become a Community Issue with multiple reports).
- Be decisive — do not call the same tool twice.`,
  ],
  ["human", "{input}"],
  ["placeholder", "{agent_scratchpad}"],
]);

async function buildAgentExecutor() {
  const agent = await createToolCallingAgent({
    llm: getTextModel(),
    tools,
    prompt: agentPrompt,
  });

  return new AgentExecutor({
    agent,
    tools,
    verbose: process.env.NODE_ENV === "development", // log tool-call reasoning in dev
  });
}

/**
 * Full agent-driven workflow for a new report. Classification and image
 * analysis still run as deterministic chains first (there's no ambiguity
 * about whether to run those — every report needs classifying), then the
 * AgentExecutor takes over for the "what should happen next" reasoning.
 *
 * @param {object} newReportDoc - saved Mongoose Report document
 * @param {object} [options] - { imageBase64, imageMimeType }
 */
async function runAgentWorkflow(newReportDoc, options = {}) {
  // Deterministic step 1: classify text (always needed, no reason to let the
  // agent "decide" whether to classify — every report must be classified).
  const textAnalysis = await classifyReportChain(newReportDoc.description);

  let imageAnalysis = null;
  if (options.imageBase64) {
    imageAnalysis = await analyzeImageChain(options.imageBase64, options.imageMimeType);
  }

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

  // Agentic step 2: let the LLM decide which downstream tools to run.
  const executor = await buildAgentExecutor();

  const agentInput = `New report submitted.
Category: ${textAnalysis.category}
Severity: ${finalSeverityGuess}
Description: "${newReportDoc.description}"
Village ID: ${newReportDoc.villageId}
Location: ${newReportDoc.latitude}, ${newReportDoc.longitude}
Report ID: ${newReportDoc._id}

Decide what to do next using your tools, then summarize your conclusion.`;

  const agentResult = await executor.invoke({ input: agentInput });

  // The agent's tool calls already touched the DB indirectly via similarity
  // lookups (read-only), but merging/creating the CommunityIssue is still
  // deterministic — we don't want the LLM writing documents directly.
  // We parse its final summary for the merge decision it reasoned about,
  // falling back to "create new issue" if unclear.
  let communityIssue;
  let isNewIssue = false;

  // Re-run the similarity check directly (cheap, deterministic) to get a
  // structured decision we can safely act on, rather than parsing free text.
  const candidates = await Report.find({
    villageId: newReportDoc.villageId,
    category: textAnalysis.category,
    createdAt: { $gte: new Date(Date.now() - 14 * 86_400_000) },
    _id: { $ne: newReportDoc._id },
  }).lean();

  const { isLikelyDuplicate } = require("../services/ai/similarityService");
  let bestMatch = null;
  for (const candidate of candidates) {
    const result = await isLikelyDuplicate(
      {
        description: newReportDoc.description,
        category: textAnalysis.category,
        latitude: newReportDoc.latitude,
        longitude: newReportDoc.longitude,
      },
      candidate
    );
    if (result.isMatch && (!bestMatch || result.score > bestMatch.score)) {
      bestMatch = { candidate, ...result };
    }
  }

  if (bestMatch && bestMatch.candidate.communityIssueId) {
    communityIssue = await CommunityIssue.findById(bestMatch.candidate.communityIssueId);
    communityIssue.reportIds.push(newReportDoc._id);
    communityIssue.lastReportedAt = new Date();
  } else {
    isNewIssue = true;
    communityIssue = await CommunityIssue.create({
      title: `${textAnalysis.subcategory} issue`,
      description: newReportDoc.description,
      category: textAnalysis.category,
      villageId: newReportDoc.villageId,
      latitude: newReportDoc.latitude,
      longitude: newReportDoc.longitude,
      severity: finalSeverityGuess,
      reportIds: [newReportDoc._id],
      status: "NEW",
      firstReportedAt: new Date(),
      lastReportedAt: new Date(),
      escalationLevel: 0,
    });
  }

  newReportDoc.communityIssueId = communityIssue._id;
  await newReportDoc.save();

  const allReports = await Report.find({ communityIssueId: communityIssue._id }).lean();
  communityIssue.affectedPeople = allReports.length;
  await communityIssue.save();

  return {
    report: newReportDoc,
    communityIssue,
    isNewIssue,
    agentReasoning: agentResult.output, // the LLM's own summary — great for demo UI
  };
}

module.exports = { runAgentWorkflow, buildAgentExecutor };
