// tests/roleMiddleware.test.js
//
// Tests the requireRole middleware in isolation using a tiny throwaway
// Express app, rather than a real route — keeps the test focused on just
// the permission logic.

const express = require("express");
const request = require("supertest");
const { requireRole } = require("../src/middleware/authMiddleware");

function buildTestApp(userRole) {
  const app = express();
  // Fake auth: skip real JWT verification, just inject a user directly
  app.use((req, res, next) => {
    req.user = { id: "fake-id", role: userRole };
    next();
  });
  app.get("/admin-only", requireRole("admin"), (req, res) => res.json({ ok: true }));
  app.get("/rep-or-admin", requireRole("village_representative", "admin"), (req, res) =>
    res.json({ ok: true })
  );
  return app;
}

describe("requireRole middleware", () => {
  it("allows access when role matches", async () => {
    const app = buildTestApp("admin");
    const res = await request(app).get("/admin-only");
    expect(res.statusCode).toBe(200);
  });

  it("blocks access when role does not match", async () => {
    const app = buildTestApp("citizen");
    const res = await request(app).get("/admin-only");
    expect(res.statusCode).toBe(403);
  });

  it("allows access when role is one of multiple allowed roles", async () => {
    const app = buildTestApp("village_representative");
    const res = await request(app).get("/rep-or-admin");
    expect(res.statusCode).toBe(200);
  });

  it("blocks a role not in the allowed list", async () => {
    const app = buildTestApp("citizen");
    const res = await request(app).get("/rep-or-admin");
    expect(res.statusCode).toBe(403);
  });
});
