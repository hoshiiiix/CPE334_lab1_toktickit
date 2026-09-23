import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
let activeRequesterEmail: string;
let categoryId: number;
let relatedSystemId: number;

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: DEV_PASSWORD });
  return agent;
}

beforeAll(async () => {
  const prisma = getPrisma();
  const active = await prisma.user.findFirst({ where: { isActive: true, role: "REQUESTER" } });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  activeRequesterEmail = active!.email;
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;
});

describe("POST /api/tickets", () => {
  it("API-01: creates a ticket with valid data and returns a Ticket Number", async () => {
    const agent = await loginAs(activeRequesterEmail);
    const res = await agent
      .post("/api/tickets")
      .field("categoryId", String(categoryId))
      .field("relatedSystemId", String(relatedSystemId))
      .field("summary", "Laptop battery drains quickly")
      .field("description", "The battery drains much faster than usual, even when idle.")
      .field("requestedPriority", "MEDIUM");

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
  });

  it("API-02: rejects a summary that is too short", async () => {
    const agent = await loginAs(activeRequesterEmail);
    const res = await agent
      .post("/api/tickets")
      .field("categoryId", String(categoryId))
      .field("relatedSystemId", String(relatedSystemId))
      .field("summary", "Hi")
      .field("description", "The battery drains much faster than usual, even when idle.")
      .field("requestedPriority", "MEDIUM");

    expect(res.status).toBe(400);
    expect(res.body.fields.summary).toBeDefined();
  });

  it("API-12b (Lab 3): rejects requests with no session at all (401)", async () => {
    const res = await request(app).post("/api/tickets").field("summary", "x");
    expect(res.status).toBe(401);
  });

  it("API-13: generates unique ticket numbers under concurrent creation", async () => {
    const agent = await loginAs(activeRequesterEmail);
    const makeReq = () =>
      agent
        .post("/api/tickets")
        .field("categoryId", String(categoryId))
        .field("relatedSystemId", String(relatedSystemId))
        .field("summary", "Concurrent creation test ticket")
        .field("description", "Testing concurrent ticket number generation safety.")
        .field("requestedPriority", "LOW");

    const results = await Promise.all([makeReq(), makeReq(), makeReq()]);
    const numbers = results.map((r) => r.body.ticketNumber);
    expect(new Set(numbers).size).toBe(numbers.length);
  });
});
