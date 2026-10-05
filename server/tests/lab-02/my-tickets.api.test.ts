import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
let requesterAEmail: string;
let requesterBEmail: string;
let categoryId: number;
let relatedSystemId: number;

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: DEV_PASSWORD });
  return agent;
}

async function createTicket(agent: any, summary: string) {
  return agent
    .post("/api/tickets")
    .field("categoryId", String(categoryId))
    .field("relatedSystemId", String(relatedSystemId))
    .field("summary", summary)
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
}

let agentA: any;

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.user.findMany({
    where: { isActive: true, role: "REQUESTER" },
    take: 2,
  });
  requesterAEmail = requesters[0].email;
  requesterBEmail = requesters[1].email;
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;

  agentA = await loginAs(requesterAEmail);
  const agentB = await loginAs(requesterBEmail);

  await createTicket(agentA, "Alpha ticket for search test");
  await createTicket(agentA, "Beta ticket unrelated");
  await createTicket(agentB, "Requester B ticket should not leak");
});

describe("GET /api/tickets (API-05)", () => {
  it("only returns tickets owned by the current requester", async () => {
    const res = await agentA.get("/api/tickets");
    expect(res.status).toBe(200);
    for (const t of res.body.data) {
      expect(t.summary).not.toMatch(/Requester B/);
    }
  });

  it("API-06: search matches by summary substring", async () => {
    const res = await agentA.get("/api/tickets?search=Alpha");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const t of res.body.data) {
      expect(t.summary.toLowerCase()).toContain("alpha");
    }
  });

  it("API-08: pagination returns correct metadata", async () => {
    const res = await agentA.get("/api/tickets?page=1&pageSize=1");
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
  });

  it("invalid page/pageSize fall back to defaults instead of erroring", async () => {
    const res = await agentA.get("/api/tickets?page=-5&pageSize=9999");
    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBeLessThanOrEqual(50);
  });
});
