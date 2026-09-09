# LangChain Integration — Setup & Phase Mapping

## 1. Install dependencies

```bash
npm install langchain @langchain/core @langchain/groq @langchain/google-genai zod
```

## 2. Add to your .env

```
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-2.0-flash
```

## 3. File structure this adds

```
backend/src/langchain/
├── models.js                      # ChatGroq, ChatGoogleGenerativeAI, embeddings instances
├── schemas.js                     # Zod schemas for structured output
├── chains.js                      # PromptTemplate + structured output chains
├── tools.js                       # DynamicStructuredTool wrappers around your DB/similarity logic
└── ruralProblemAgentExecutor.js   # AgentExecutor — LLM decides which tools to call
```

## 4. How this maps to your phases

| Phase | Old approach | New LangChain approach |
|---|---|---|
| Phase 3 (Text classification) | `reportAnalyzer.js` + raw fetch + manual JSON.parse | `chains.js` → `classifyReportChain()` using `PromptTemplate` + `withStructuredOutput()` |
| Phase 4 (Image analysis) | `geminiService.js` raw multimodal fetch | `chains.js` → `analyzeImageChain()` using `HumanMessage` with image content + `withStructuredOutput()` |
| Phase 5 (Duplicate detection) | `similarityService.js` (unchanged — this stays as plain math, no LangChain needed here) | Wrapped as a callable Tool in `tools.js` (`find_similar_reports`) for the agent to invoke |
| Phase 6 (Severity/emerging) | Plain functions in `ruralProblemAgent.js` | Wrapped as Tools (`calculate_severity`, `detect_emerging_issue`) — deterministic math, but now the agent LLM decides *when* to call them |
| Phase 7 (Agent orchestration) | Hardcoded `if/else` in `runWorkflow()` | `AgentExecutor` in `ruralProblemAgentExecutor.js` — the LLM reads tool descriptions and decides which to call, in what order |
| Phase 9 (Escalation summary) | Raw Groq/Gemini call | `chains.js` → `generateEscalationSummaryChain()` using `PromptTemplate` |

## 5. What to actually build first

Don't jump straight to the full `AgentExecutor` (Phase 7's file). Build in this order so you always have something working to demo:

1. **`chains.js` first** — swap in classification + image analysis. Test these standalone (they don't depend on the agent).
2. **`tools.js` second** — wrap your existing DB logic as tools, but keep calling them directly (not through the agent yet) to confirm each tool function works correctly in isolation.
3. **`ruralProblemAgentExecutor.js` last** — once chains and tools are proven individually, wire them into the `AgentExecutor`. Use `verbose: true` in dev to watch the agent's tool-call reasoning in your terminal — this is genuinely useful for debugging *and* great to screen-record for a demo/portfolio video ("here's the agent deciding not to check for duplicates on a one-off report").

## 6. Route wiring (controller-level)

Your report controller should call ONE of these, not both — pick based on which phase you're in:

```js
// Deterministic version (Phase 7 baseline, always reliable):
const { runWorkflow } = require("../agents/ruralProblemAgent");

// True agentic version (Phase 7 stretch goal, once tested):
const { runAgentWorkflow } = require("../langchain/ruralProblemAgentExecutor");
```

Keep both files in your repo even after switching — being able to show "here's the hardcoded version, here's the LLM-driven version, here's why I built both" is a strong system-design talking point in an interview.

## 7. Interview-ready explanation (memorize the gist of this)

"I built the AI layer twice: first as a deterministic pipeline I fully controlled, so I understood exactly what structured output validation and duplicate-detection logic needed to do. Then I re-implemented the orchestration layer using LangChain's tool-calling agent, so the LLM itself decides which tools are relevant per report — for example, it skips the duplicate-check tool for reports that are clearly one-off events. I used Groq for fast text tasks and Gemini for multimodal image analysis and embeddings, wired together through LangChain's model abstraction so swapping providers doesn't touch my business logic."
