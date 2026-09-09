// tests/health.test.js
//
// Phase 0 smoke test — confirms the Express app boots, connects to the
// in-memory test DB (via tests/setup.js), and the health check route works.
// This is the test you run first after cloning the repo to confirm setup is correct.

const request = require("supertest");
const app = require("../src/app");

describe("Health check", () => {
  it("GET /api/health returns 200 and status ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("grampulse-backend");
  });

  it("unknown route returns 404", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.statusCode).toBe(404);
  });
});
