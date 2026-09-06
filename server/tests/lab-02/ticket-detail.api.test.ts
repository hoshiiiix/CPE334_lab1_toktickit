import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let requesterB: number;
let ticketIdOwnedByA: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.devRequester.findMany({ where: { isActive: true }, take: 2 });
  requesterA = requesters[0].id;
  requesterB = requesters[1].id;
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

  const res = await request(app)
    .post("/api/tickets")
    .set("X-Dev-Requester-Id", String(requesterA))
    .field("categoryId", String(category!.id))
    .field("relatedSystemId", String(relatedSystem!.id))
    .field("summary", "Ticket detail ownership test")
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
  ticketIdOwnedByA = res.body.id;
});

describe("GET /api/tickets/:id", () => {
  it("returns the ticket when requested by its owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketIdOwnedByA}`)
      .set("X-Dev-Requester-Id", String(requesterA));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketIdOwnedByA);
  });

  it("API-09/AC-03: returns 404 (not 403) for a non-owner", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketIdOwnedByA}`)
      .set("X-Dev-Requester-Id", String(requesterB));
    expect(res.status).toBe(404);
    expect(res.body.summary).toBeUndefined();
  });

  it("returns 404 for a non-existent ticket id", async () => {
    const res = await request(app)
      .get(`/api/tickets/999999`)
      .set("X-Dev-Requester-Id", String(requesterA));
    expect(res.status).toBe(404);
  });
});
