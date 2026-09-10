// tests/report.test.js
//
// Image upload (Cloudinary) isn't tested here — it needs real credentials
// and network access. These tests cover text-only report submission, which
// exercises all the same logic except the upload branch.

const request = require("supertest");
const app = require("../src/app");
const Village = require("../src/models/Village");
const Report = require("../src/models/Report");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";

async function registerAndLogin(overrides = {}) {
  const village = await Village.create({
    name: "Test Village",
    district: "Test District",
    state: "Test State",
    latitude: 19.0,
    longitude: 72.0,
  });

  const res = await request(app)
    .post("/api/auth/register")
    .send({
      name: "Test Citizen",
      email: `citizen-${Date.now()}-${Math.random()}@test.com`,
      password: "SecurePass123",
      villageId: village._id.toString(),
      role: "citizen",
      ...overrides,
    });

  return { token: res.body.token, villageId: village._id.toString(), userId: res.body.user.id };
}

describe("Reports", () => {
  describe("POST /api/reports", () => {
    it("rejects an unauthenticated request", async () => {
      const res = await request(app).post("/api/reports").send({
        description: "Water is dirty",
        latitude: 19.0,
        longitude: 72.0,
      });
      expect(res.statusCode).toBe(401);
    });

    it("creates a text-only report successfully", async () => {
      const { token, villageId, userId } = await registerAndLogin();

      const res = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({
          description: "Handpump water smells bad",
          category: "water",
          latitude: 19.05,
          longitude: 72.05,
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.report.description).toBe("Handpump water smells bad");
      expect(res.body.report.category).toBe("water");
      expect(res.body.report.status).toBe("NEW");
      expect(res.body.report.villageId).toBe(villageId);
      expect(res.body.report.userId).toBe(userId);
    });

    it("rejects a report missing description", async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({ latitude: 19.0, longitude: 72.0 });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a report with missing location", async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "Something is wrong" });
      expect(res.statusCode).toBe(400);
    });

    it("defaults category to 'other' when not provided", async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "Unclear problem", latitude: 19.0, longitude: 72.0 });
      expect(res.statusCode).toBe(201);
      expect(res.body.report.category).toBe("other");
    });
  });

  describe("GET /api/reports/mine", () => {
    it("returns only the logged-in user's reports", async () => {
      const userA = await registerAndLogin();
      const userB = await registerAndLogin();

      await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ description: "User A report", latitude: 19.0, longitude: 72.0 });

      await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${userB.token}`)
        .send({ description: "User B report", latitude: 19.0, longitude: 72.0 });

      const res = await request(app)
        .get("/api/reports/mine")
        .set("Authorization", `Bearer ${userA.token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports).toHaveLength(1);
      expect(res.body.reports[0].description).toBe("User A report");
    });
  });

  describe("GET /api/reports/nearby", () => {
    it("returns only reports within the radius, sorted by distance", async () => {
      const { token, villageId } = await registerAndLogin();

      // Close report (~0.1km away)
      await Report.create({
        userId: "507f1f77bcf86cd799439011",
        villageId,
        description: "Close report",
        latitude: 19.001,
        longitude: 72.001,
      });

      // Far report (roughly 50+ km away — outside default 5km radius)
      await Report.create({
        userId: "507f1f77bcf86cd799439011",
        villageId,
        description: "Far report",
        latitude: 19.5,
        longitude: 72.5,
      });

      const res = await request(app)
        .get("/api/reports/nearby?latitude=19.0&longitude=72.0")
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.reports.length).toBe(1);
      expect(res.body.reports[0].description).toBe("Close report");
    });

    it("rejects request missing lat/lng query params", async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get("/api/reports/nearby")
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /api/reports/:id", () => {
    it("allows a citizen to view their own report", async () => {
      const { token } = await registerAndLogin();
      const createRes = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${token}`)
        .send({ description: "My own report", latitude: 19.0, longitude: 72.0 });

      const res = await request(app)
        .get(`/api/reports/${createRes.body.report._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.report.description).toBe("My own report");
    });

    it("blocks a citizen from viewing someone else's report", async () => {
      const userA = await registerAndLogin();
      const userB = await registerAndLogin();

      const createRes = await request(app)
        .post("/api/reports")
        .set("Authorization", `Bearer ${userA.token}`)
        .send({ description: "User A's private report", latitude: 19.0, longitude: 72.0 });

      const res = await request(app)
        .get(`/api/reports/${createRes.body.report._id}`)
        .set("Authorization", `Bearer ${userB.token}`);

      expect(res.statusCode).toBe(403);
    });

    it("returns 404 for a nonexistent report id", async () => {
      const { token } = await registerAndLogin();
      const res = await request(app)
        .get("/api/reports/507f1f77bcf86cd799439011")
        .set("Authorization", `Bearer ${token}`);
      expect(res.statusCode).toBe(404);
    });
  });
});
