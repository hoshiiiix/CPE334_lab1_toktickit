import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let requesterB: number;
let categoryId: number;
let relatedSystemId: number;

async function createTicket(requesterId: number, summary: string) {
  return request(app)
    .post("/api/tickets")
    .set("X-Dev-Requester-Id", String(requesterId))
    .field("categoryId", String(categoryId))
    .field("relatedSystemId", String(relatedSystemId))
    .field("summary", summary)
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.devRequester.findMany({ where: { isActive: true }, take: 2 });
  requesterA = requesters[0].id;
  requesterB = requesters[1].id;
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;

  await createTicket(requesterA, "Alpha ticket for search test");
  await createTicket(requesterA, "Beta ticket unrelated");
  await createTicket(requesterB, "Requester B ticket should not leak");
});

describe("GET /api/tickets (API-05)", () => {
  it("only returns tickets owned by the current requester", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("X-Dev-Requester-Id", String(requesterA));

    expect(res.status).toBe(200);
    for (const t of res.body.data) {
      expect(t.requesterId).toBe(requesterA);
    }
  });

  it("API-06: search matches by summary substring", async () => {
    const res = await request(app)
      .get("/api/tickets?search=Alpha")
      .set("X-Dev-Requester-Id", String(requesterA));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const t of res.body.data) {
      expect(t.summary.toLowerCase()).toContain("alpha");
    }
  });

  it("API-08: pagination returns correct metadata", async () => {
    const res = await request(app)
      .get("/api/tickets?page=1&pageSize=1")
      .set("X-Dev-Requester-Id", String(requesterA));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(1);
    expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(2);
  });

  it("invalid page/pageSize fall back to defaults instead of erroring", async () => {
    const res = await request(app)
      .get("/api/tickets?page=-5&pageSize=9999")
      .set("X-Dev-Requester-Id", String(requesterA));

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBeLessThanOrEqual(50);
  });
});
