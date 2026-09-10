// app.js creates express
//Responsible for:

// Express configuration
// +
// middleware
// +
// routes
// +
// error handling
// Express app setup, separated from server.js so tests can `require('./app')`
// and use supertest without actually binding a port.

const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));  //This controls which frontend is allowed to communicate with your backend
app.use(express.json({ limit: "10mb" })); // generous limit for base64 image payloads
app.use(express.urlencoded({ extended: true }));

// Health check — useful for deployment platforms and quick sanity checks
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "grampulse-backend", timestamp: new Date().toISOString() });
});

// ── Routes ───────────────────────────────────────────────
// Uncomment as each phase's routes are built:
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
// app.use("/api/issues", require("./routes/issueRoutes"));
// app.use("/api/villages", require("./routes/villageRoutes"));
// app.use("/api/weather", require("./routes/weatherRoutes"));
// app.use("/api/dashboard", require("./routes/dashboardRoutes"));

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

// Centralized error handler — every controller should call next(err) on failure
app.use((err, req, res, next) => {
  console.error("[error]", err.message);
  const status = err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
});

module.exports = app;
