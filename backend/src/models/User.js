// models/User.js
//
// A single collection holds all three roles (citizen, village_representative,
// admin) rather than separate collections — this is simpler for a project
// this size, and role-based permission checks happen in middleware, not
// by which collection a document lives in.

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false, // never returned in queries unless explicitly requested
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["citizen", "village_representative", "admin"],
      default: "citizen",
      required: true,
    },
    villageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Village",
      // required for citizen and village_representative, not for admin —
      // enforced in the controller rather than here, since Mongoose's
      // conditional-required syntax gets messy for role-dependent rules
    },
  },
  { timestamps: true } // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("User", userSchema);
