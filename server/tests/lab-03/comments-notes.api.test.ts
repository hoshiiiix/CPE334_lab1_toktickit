import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
let requesterA: any;
let requesterB: any;
let staff: any;
let ticketId: number;

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: DEV_PASSWORD });
  return agent;
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requesters = await prisma.user.findMany({
    where: { isActive: true, role: "REQUESTER", NOT: { email: { startsWith: "e2e-" } } },
    orderBy: { id: "asc" },
    take: 2,
  });
  const staffUser = await prisma.user.findFirst({ where: { isActive: true, role: "IT_STAFF", NOT: { email: { startsWith: "e2e-" } } }, orderBy: { id: "asc" } });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });

  requesterA = await loginAs(requesters[0].email);
  requesterB = await loginAs(requesters[1].email);
  staff = await loginAs(staffUser!.email);

  const res = await requesterA
    .post("/api/tickets")
    .field("categoryId", String(category!.id))
    .field("relatedSystemId", String(relatedSystem!.id))
    .field("summary", "Comments and resolved flag test")
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
  ticketId = res.body.id;
});

describe("Public Comments (Requester)", () => {
  it("API-14: rejects an empty or whitespace-only comment with 400", async () => {
    const res = await requesterA.post(`/api/tickets/${ticketId}/comments`).send({ content: "   " });
    expect(res.status).toBe(400);
  });

  it("lets the owning Requester post and read a comment, author taken from the session", async () => {
    const post = await requesterA.post(`/api/tickets/${ticketId}/comments`).send({ content: "Still happening today." });
    expect(post.status).toBe(201);
    expect(post.body.authorRole).toBe("REQUESTER");

    const list = await requesterA.get(`/api/tickets/${ticketId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.some((c: any) => c.content === "Still happening today.")).toBe(true);
  });

  it("lets IT Staff see the Requester's public comment", async () => {
    const list = await staff.get(`/api/tickets/${ticketId}/comments`);
    expect(list.status).toBe(200);
    expect(list.body.some((c: any) => c.content === "Still happening today.")).toBe(true);
  });

  it("returns 404 for another Requester reading or posting on a ticket they do not own", async () => {
    const read = await requesterB.get(`/api/tickets/${ticketId}/comments`);
    const write = await requesterB.post(`/api/tickets/${ticketId}/comments`).send({ content: "Intruder" });
    expect(read.status).toBe(404);
    expect(write.status).toBe(404);
  });
});

describe("Internal Notes are hidden from Requesters (API-07, AC-05)", () => {
  it("returns 403 and no note data for a Requester", async () => {
    const res = await requesterA.get(`/api/tickets/${ticketId}/notes`);
    expect(res.status).toBe(403);
    expect(Array.isArray(res.body)).toBe(false);
  });
});

describe("PATCH /api/tickets/:id/mark-resolved (API-13, AC-09, BR-05)", () => {
  it("API-14b: returns 404 for a Requester who does not own the ticket", async () => {
    const res = await requesterB.patch(`/api/tickets/${ticketId}/mark-resolved`);
    expect(res.status).toBe(404);
  });

  it("API-14b: returns 403 for IT Staff (only the Requester can use this action)", async () => {
    const res = await staff.patch(`/api/tickets/${ticketId}/mark-resolved`);
    expect(res.status).toBe(403);
  });

  it("API-13: sets requesterMarkedResolved without changing currentStatus", async () => {
    const before = await requesterA.get(`/api/tickets/${ticketId}`);
    const res = await requesterA.patch(`/api/tickets/${ticketId}/mark-resolved`);
    expect(res.status).toBe(200);
    expect(res.body.requesterMarkedResolved).toBe(true);

    const after = await requesterA.get(`/api/tickets/${ticketId}`);
    expect(after.body.currentStatus).toBe(before.body.currentStatus);
  });

  it("API-14b: returns 409 when the ticket is already Closed or Cancelled", async () => {
    const prisma = getPrisma();
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "CANCELLED" } });
    const res = await requesterA.patch(`/api/tickets/${ticketId}/mark-resolved`);
    expect(res.status).toBe(409);
    await prisma.ticket.update({ where: { id: ticketId }, data: { currentStatus: "NEW" } });
  });
});
