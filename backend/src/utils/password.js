// utils/password.js
//
// Never store plain-text passwords. bcrypt "hashes" a password into a
// scrambled string that can't be reversed back into the original — you can
// only check "does this new password produce the same hash," not decrypt it.

const bcrypt = require("bcrypt");

const SALT_ROUNDS = 10; // higher = slower but more secure; 10 is a solid default

async function hashPassword(plainTextPassword) {
  return bcrypt.hash(plainTextPassword, SALT_ROUNDS);
}

async function comparePassword(plainTextPassword, hash) {
  return bcrypt.compare(plainTextPassword, hash);
}

module.exports = { hashPassword, comparePassword };
