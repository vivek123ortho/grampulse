// tests/auth.test.js

const request = require("supertest");
const app = require("../src/app");
const Village = require("../src/models/Village");

// JWT_SECRET must be set for token generation/verification to work in tests
process.env.JWT_SECRET = process.env.JWT_SECRET || "test_secret";

describe("Auth", () => {
  let villageId;

  beforeEach(async () => {
    const village = await Village.create({
      name: "Test Village",
      district: "Test District",
      state: "Test State",
      latitude: 19.0,
      longitude: 72.0,
    });
    villageId = village._id.toString();
  });

  describe("POST /api/auth/register", () => {
    it("registers a new citizen successfully", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test Citizen",
        email: "citizen@test.com",
        password: "SecurePass123",
        villageId,
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("citizen@test.com");
      expect(res.body.user.role).toBe("citizen");
      // password/hash should never come back in the response
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.user.password).toBeUndefined();
    });

    it("registers an admin without requiring villageId", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "Test Admin",
        email: "admin@test.com",
        password: "SecurePass123",
        role: "admin",
      });

      expect(res.statusCode).toBe(201);
      expect(res.body.user.role).toBe("admin");
    });

    it("rejects registration with missing required fields", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "incomplete@test.com",
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects a citizen/representative registration without villageId", async () => {
      const res = await request(app).post("/api/auth/register").send({
        name: "No Village",
        email: "novillage@test.com",
        password: "SecurePass123",
      });
      expect(res.statusCode).toBe(400);
    });

    it("rejects duplicate email registration", async () => {
      await request(app).post("/api/auth/register").send({
        name: "First",
        email: "dup@test.com",
        password: "SecurePass123",
        villageId,
      });

      const res = await request(app).post("/api/auth/register").send({
        name: "Second",
        email: "dup@test.com",
        password: "AnotherPass123",
        villageId,
      });

      expect(res.statusCode).toBe(409);
    });
  });

  describe("POST /api/auth/login", () => {
    beforeEach(async () => {
      await request(app).post("/api/auth/register").send({
        name: "Login Test User",
        email: "login@test.com",
        password: "CorrectPassword123",
        villageId,
      });
    });

    it("logs in with correct credentials", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login@test.com",
        password: "CorrectPassword123",
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe("login@test.com");
    });

    it("rejects login with wrong password", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "login@test.com",
        password: "WrongPassword",
      });
      expect(res.statusCode).toBe(401);
    });

    it("rejects login for a nonexistent email", async () => {
      const res = await request(app).post("/api/auth/login").send({
        email: "doesnotexist@test.com",
        password: "Whatever123",
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe("GET /api/auth/me", () => {
    it("rejects request with no token", async () => {
      const res = await request(app).get("/api/auth/me");
      expect(res.statusCode).toBe(401);
    });

    it("rejects request with an invalid token", async () => {
      const res = await request(app)
        .get("/api/auth/me")
        .set("Authorization", "Bearer not.a.real.token");
      expect(res.statusCode).toBe(401);
    });

    it("returns the logged-in user's profile with a valid token", async () => {
      const registerRes = await request(app).post("/api/auth/register").send({
        name: "Profile Test",
        email: "profile@test.com",
        password: "SecurePass123",
        villageId,
      });

      const token = registerRes.body.token;

      const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${token}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.email).toBe("profile@test.com");
    });
  });
});
