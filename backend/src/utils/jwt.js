// utils/jwt.js
//
// A JWT (JSON Web Token) is a signed, tamper-proof string that encodes
// "who this user is" (their id and role). The server hands it to the user
// at login; the user sends it back on every future request (in the
// Authorization header) instead of logging in again each time.

const jwt = require("jsonwebtoken");

function generateToken(user) {
  const payload = {
    id: user._id.toString(),
    role: user.role,
    villageId: user.villageId ? user.villageId.toString() : null,
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

function verifyToken(token) {
  // Throws if invalid/expired — caller (middleware) is responsible for catching it
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { generateToken, verifyToken };
