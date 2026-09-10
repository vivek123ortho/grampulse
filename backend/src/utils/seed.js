// utils/seed.js
//
// Run with: npm run seed
// Populates the database with a couple of villages and one user per role,
// so you have something to log in with immediately during development.
// Safe to re-run — it clears these collections first.

require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const Village = require("../models/Village");
const User = require("../models/User");
const { hashPassword } = require("./password");

async function seed() {
  await connectDB();

  console.log("[seed] Clearing existing Villages and Users...");
  await Village.deleteMany({});
  await User.deleteMany({});

  console.log("[seed] Creating villages...");
  const devgaon = await Village.create({
    name: "Devgaon",
    district: "Sample District",
    state: "Sample State",
    latitude: 19.076,
    longitude: 72.8777,
    population: 4200,
    healthScore: 72,
  });

  const karanjgaon = await Village.create({
    name: "Karanjgaon",
    district: "Sample District",
    state: "Sample State",
    latitude: 19.09,
    longitude: 72.89,
    population: 3100,
    healthScore: 65,
  });

  console.log("[seed] Creating users (password for all: Password123!)...");
  const passwordHash = await hashPassword("Password123!");

  await User.create([
    {
      name: "Asha Citizen",
      email: "citizen@example.com",
      passwordHash,
      role: "citizen",
      villageId: devgaon._id,
    },
    {
      name: "Ravi Representative",
      email: "rep@example.com",
      passwordHash,
      role: "village_representative",
      villageId: devgaon._id,
    },
    {
      name: "District Admin",
      email: "admin@example.com",
      passwordHash,
      role: "admin",
    },
  ]);

  console.log("[seed] Done. Sample logins (all use password: Password123!):");
  console.log("  citizen@example.com          (citizen, Devgaon)");
  console.log("  rep@example.com               (village_representative, Devgaon)");
  console.log("  admin@example.com             (admin)");

  await mongoose.connection.close();
}

seed().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
