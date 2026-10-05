import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const KNOWN_PASSWORD = "DevPass123!";
let activeRequesterEmail: string;
let inactiveRequesterEmail: string;

beforeAll(async () => {
  const prisma = getPrisma();
  const active = await prisma.user.findFirst({ where: { isActive: true, role: "REQUESTER", NOT: { email: { startsWith: "e2e-" } } }, orderBy: { id: "asc" } });
  const inactive = await prisma.user.findFirst({ where: { isActive: false, NOT: { email: { startsWith: "e2e-" } } }, orderBy: { id: "asc" } });
  activeRequesterEmail = active!.email;
  inactiveRequesterEmail = inactive!.email;
});

describe("POST /api/auth/login", () => {
  it("API-01: valid login sets a session cookie and returns identity", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: activeRequesterEmail, password: KNOWN_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("REQUESTER");
    expect(res.headers["set-cookie"]?.[0]).toMatch(/toktickit_session=/);
  });

  it("API-02: wrong password and inactive account return the identical generic message", async () => {
    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: activeRequesterEmail, password: "WrongPassword1!" });
    const inactiveAccount = await request(app)
      .post("/api/auth/login")
      .send({ email: inactiveRequesterEmail, password: KNOWN_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(inactiveAccount.status).toBe(401);
    expect(wrongPassword.body.error).toBe(inactiveAccount.body.error);
  });
});

describe("GET /api/auth/me", () => {
  it("returns 401 without a session", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns the current user with a valid session", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: activeRequesterEmail, password: KNOWN_PASSWORD });
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(activeRequesterEmail);
  });
});

describe("POST /api/auth/logout", () => {
  it("API-13: invalidates the session so /me returns 401 afterward", async () => {
    const agent = request.agent(app);
    await agent.post("/api/auth/login").send({ email: activeRequesterEmail, password: KNOWN_PASSWORD });
    await agent.post("/api/auth/logout");
    const res = await agent.get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Rate limiting (API-03, BR-07)", () => {
  it("blocks after 5 consecutive failed attempts within the window", async () => {
    const email = "rate-limit-test@example.com";
    for (let i = 0; i < 5; i++) {
      await request(app).post("/api/auth/login").send({ email, password: "wrong" });
    }
    const res = await request(app).post("/api/auth/login").send({ email, password: "wrong" });
    expect(res.status).toBe(429);
  });
});

describe("Session lifetime (API-19, AC-15, BR-08)", () => {
  it("API-19: a session older than 7 days is rejected with 401 and the user must log in again", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ email: activeRequesterEmail, password: KNOWN_PASSWORD });
    expect(login.status).toBe(200);
    const sessionId = /toktickit_session=([^;]+)/.exec(String(login.headers["set-cookie"]?.[0]))![1];

    expect((await agent.get("/api/auth/me")).status).toBe(200);

    // Age the session: expiry moves to 8 days before now, as if it had been issued 15 days ago.
    await getPrisma().session.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } });

    expect((await agent.get("/api/auth/me")).status).toBe(401);
    const relogin = await agent.post("/api/auth/login").send({ email: activeRequesterEmail, password: KNOWN_PASSWORD });
    expect(relogin.status).toBe(200);
  });
});
