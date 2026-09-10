// utils/geo.js
//
// Shared location math. Both the "nearby reports" feature (Phase 2) and the
// duplicate-detection similarity logic (Phase 5) need to calculate distance
// between two lat/lng points, so it lives here once instead of being
// duplicated.

/**
 * Haversine distance in kilometers between two lat/lng points.
 */
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

module.exports = { distanceKm };
