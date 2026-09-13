// langchain/models.js
//
// Central place where LangChain chat model instances are created.
// Groq handles fast text-only tasks (classification, recommendations, summaries).
// Gemini handles multimodal tasks (image analysis) and embeddings.
//
// IMPORTANT: these models are created LAZILY (only when first actually used),
// not at import time. ChatGroq/ChatGoogleGenerativeAI throw immediately if
// their API key is missing — if we constructed them at the top of this file,
// simply requiring this module (e.g. when Express boots and loads all
// routes) would crash the entire server before it even starts, just because
// an API key isn't set yet. Lazy getters let the rest of the app run fine
// with AI features degraded/unavailable, instead of refusing to start at all.
//
// Install: npm install @langchain/groq @langchain/google-genai langchain zod

const { ChatGroq } = require("@langchain/groq");
const { ChatGoogleGenerativeAI } = require("@langchain/google-genai");
const { GoogleGenerativeAIEmbeddings } = require("@langchain/google-genai");

let _textModel = null;
let _visionModel = null;
let _embeddingsModel = null;

/** Fast text model — used for classification, recommendations, summaries. */
function getTextModel() {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not set — cannot use the text model");
  }
  if (!_textModel) {
    _textModel = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
      temperature: 0.2, // low temperature: consistent, non-creative structured output
    });
  }
  return _textModel;
}

/** Multimodal model — used only when an image is attached to a report. */
function getVisionModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set — cannot use the vision model");
  }
  if (!_visionModel) {
    // NOTE: gemini-2.0-flash was retired March 2026 — using 2.5-flash instead.
    _visionModel = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      temperature: 0.2,
    });
  }
  return _visionModel;
}

/** Embeddings model — used for semantic similarity between report descriptions. */
function getEmbeddingsModel() {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not set — cannot use the embeddings model");
  }
  if (!_embeddingsModel) {
    _embeddingsModel = new GoogleGenerativeAIEmbeddings({
      apiKey: process.env.GEMINI_API_KEY,
      model: "text-embedding-004",
    });
  }
  return _embeddingsModel;
}

module.exports = { getTextModel, getVisionModel, getEmbeddingsModel };
