// server.js  is responsible
// starting the application
// +
// connecting database
// +
// opening port
//
// Entry point. Loads env vars, connects to MongoDB, then starts the HTTP server.

require("dotenv").config(); // this means read the env file and put its value into process.env
const app = require("./app"); //Go to src/app.js, execute it, and give me the Express application.
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`[server] GramPulse backend running on port ${PORT}`);
    console.log(`[server] Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

start().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
