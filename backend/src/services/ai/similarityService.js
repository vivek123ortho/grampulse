// services/ai/similarityService.js
//
// Semantic similarity between report descriptions, used to decide whether
// a new report should be merged into an existing CommunityIssue.
// Uses embeddings (meaning-based comparison) rather than keyword matching,
// so "water tastes bad" and "handpump water seems off" can match even with
// almost no overlapping words.

const { getEmbedding } = require("./geminiService");

/**
 * Cosine similarity between two equal-length vectors. Returns a value from
 * -1 to 1; in practice embedding similarity for related short texts is
 * usually in the 0.7-0.95 range.
 */
function cosineSimilarity(a, b) {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Haversine distance in km between two lat/lng points.
 */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TEXT_SIMILARITY_THRESHOLD = 0.82; // tune against real test cases
const MAX_DISTANCE_KM = 2;
const MAX_AGE_DAYS = 14;

/**
 * Decide whether a new report should merge into an existing candidate report/issue.
 * Combines: same category (hard filter) + geo proximity + recency + semantic similarity.
 *
 * @param {object} newReport - { description, category, latitude, longitude }
 * @param {object} candidate - existing report/issue with same shape + createdAt
 * @returns {Promise<{isMatch: boolean, score: number, reason: string}>}
 */
async function isLikelyDuplicate(newReport, candidate) {
  if (newReport.category !== candidate.category) {
    return { isMatch: false, score: 0, reason: "different category" };
  }

  const km = distanceKm(
    newReport.latitude,
    newReport.longitude,
    candidate.latitude,
    candidate.longitude
  );
  if (km > MAX_DISTANCE_KM) {
    return { isMatch: false, score: 0, reason: `too far apart (${km.toFixed(1)}km)` };
  }

  const ageDays = (Date.now() - new Date(candidate.createdAt).getTime()) / 86_400_000;
  if (ageDays > MAX_AGE_DAYS) {
    return { isMatch: false, score: 0, reason: "candidate too old" };
  }

  const [embA, embB] = await Promise.all([
    getEmbedding(newReport.description),
    getEmbedding(candidate.description),
  ]);
  const textScore = cosineSimilarity(embA, embB);

  return {
    isMatch: textScore >= TEXT_SIMILARITY_THRESHOLD,
    score: textScore,
    reason: `text similarity ${textScore.toFixed(3)}, ${km.toFixed(1)}km apart, ${ageDays.toFixed(1)}d old`,
  };
}

module.exports = { isLikelyDuplicate, cosineSimilarity, distanceKm };
