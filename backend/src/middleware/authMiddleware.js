// middleware/authMiddleware.js
//
// "Middleware" runs BEFORE your route's controller. This one acts as a
// bouncer: it checks whether the incoming request has a valid login token.
// If yes, it attaches the user's info to `req.user` so later code can use
// it (e.g. "which village does this citizen belong to?"). If no, it stops
// the request right here with a 401 error — the controller never even runs.

const { verifyToken } = require("../utils/jwt");

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization; // expected format: "Bearer <token>"

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or malformed Authorization header" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);
    req.user = decoded; // { id, role, villageId }
    next(); // pass control to the actual route handler
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Restrict a route to specific roles. Use AFTER requireAuth.
 * Example: router.get('/admin-only', requireAuth, requireRole('admin'), handler)
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: "You don't have permission to access this" });
    }
    next();
  };
}

module.exports = { requireAuth, requireRole };
