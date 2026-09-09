// services/ai/geminiService.js
//
// Single point of contact with the Gemini API.
// Nothing else in the codebase should call fetch() to Gemini directly —
// this keeps prompt/response handling, retries, and JSON parsing in one place.

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

if (!GEMINI_API_KEY) {
  console.warn("[geminiService] GEMINI_API_KEY is not set — AI calls will fail.");
}

/**
 * Send a text-only prompt to Gemini and get back raw text.
 * @param {string} prompt
 * @param {object} [options]
 * @param {boolean} [options.jsonMode] - if true, instructs the model to return only JSON
 * @returns {Promise<string>} raw text response
 */
async function generateText(prompt, { jsonMode = false } = {}) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2, // low temperature: we want consistent, non-creative classification
      ...(jsonMode ? { responseMimeType: "application/json" } : {}),
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API returned no text content");
  }

  return text;
}

/**
 * Send an image (base64) + prompt to Gemini's multimodal endpoint.
 * @param {string} base64Image - base64-encoded image data (no data: prefix)
 * @param {string} mimeType - e.g. "image/jpeg"
 * @param {string} prompt
 * @returns {Promise<string>} raw text response
 */
async function generateFromImage(base64Image, mimeType, prompt) {
  const body = {
    contents: [
      {
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Image } },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Gemini API returned no text content for image analysis");
  }

  return text;
}

/**
 * Get an embedding vector for a piece of text (used for similarity comparisons).
 * Uses Gemini's embedding model, separate endpoint from generateContent.
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GEMINI_API_KEY}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: { parts: [{ text }] },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini embedding error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const values = data?.embedding?.values;

  if (!values) {
    throw new Error("Gemini embedding API returned no values");
  }

  return values;
}

module.exports = { generateText, generateFromImage, getEmbedding };
