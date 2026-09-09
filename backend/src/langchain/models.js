// langchain/models.js
//
// Central place where LangChain chat model instances are created.
// Groq handles fast text-only tasks (classification, summaries, recommendations).
// Gemini handles multimodal tasks (image analysis) and embeddings.
//
// Install: npm install @langchain/groq @langchain/google-genai langchain zod

const { ChatGroq } = require("@langchain/groq");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

// Fast text model — used for classification, recommendations, summaries.
// Low temperature: we want consistent, non-creative structured output.
const textModel = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
  temperature: 0.2,
});

// Multimodal model — used only when an image is attached to a report.
const visionModel = new ChatGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY,
  model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
  temperature: 0.2,
});

// Embeddings model — used for semantic similarity between report descriptions.
const embeddingsModel = new GoogleGenerativeAIEmbeddings({
  apiKey: process.env.GEMINI_API_KEY,
  model: "text-embedding-004",
});

module.exports = { textModel, visionModel, embeddingsModel };
