// controllers/authController.js

const User = require("../models/User");
const { hashPassword, comparePassword } = require("../utils/password");
const { generateToken } = require("../utils/jwt");

const VALID_ROLES = ["citizen", "village_representative", "admin"];

async function register(req, res, next) {
  try {
    const { name, email, password, phone, role, villageId } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, and password are required" });
    }

    const chosenRole = role && VALID_ROLES.includes(role) ? role : "citizen";

    if (chosenRole !== "admin" && !villageId) {
      return res.status(400).json({ error: "villageId is required for citizens and representatives" });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: chosenRole,
      villageId: chosenRole !== "admin" ? villageId : undefined,
    });

    const token = generateToken(user);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        villageId: user.villageId,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // passwordHash has `select: false` in the schema, so we must explicitly request it
    const user = await User.findOne({ email: email.toLowerCase() }).select("+passwordHash");

    if (!user) {
      // Deliberately vague error — don't reveal whether the email exists
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        villageId: user.villageId,
      },
    });
  } catch (err) {
    next(err);
  }
}

/** Returns the currently logged-in user's own profile. Requires requireAuth middleware. */
async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
}

module.exports = { register, login, getMe };
