import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
let agentA: any;
let agentB: any;
let ticketIdOwnedByA: number;

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: DEV_PASSWORD });
  return agent;
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.user.findMany({
    where: { isActive: true, role: "REQUESTER" },
    take: 2,
  });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

  agentA = await loginAs(requesters[0].email);
  agentB = await loginAs(requesters[1].email);

  const res = await agentA
    .post("/api/tickets")
    .field("categoryId", String(category!.id))
    .field("relatedSystemId", String(relatedSystem!.id))
    .field("summary", "Ticket detail ownership test")
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
  ticketIdOwnedByA = res.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the ticket when requested by its owner", async () => {
    const res = await agentA.get(`/api/tickets/${ticketIdOwnedByA}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketIdOwnedByA);
  });

  it("API-09/AC-03: returns 404 (not 403) for a non-owner", async () => {
    const res = await agentB.get(`/api/tickets/${ticketIdOwnedByA}`);
    expect(res.status).toBe(404);
    expect(res.body.summary).toBeUndefined();
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await agentA.get(`/api/tickets/999999`);
    expect(res.status).toBe(404);
  });
});
