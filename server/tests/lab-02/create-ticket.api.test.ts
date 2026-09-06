import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let activeRequesterId: number;
let inactiveRequesterId: number;
let categoryId: number;
let relatedSystemId: number;

beforeAll(async () => {
  const prisma = getPrisma();
  const active = await prisma.devRequester.findFirst({ where: { isActive: true } });
  const inactive = await prisma.devRequester.findFirst({ where: { isActive: false } });
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  activeRequesterId = active!.id;
  inactiveRequesterId = inactive!.id;
  categoryId = category!.id;
  relatedSystemId = relatedSystem!.id;
});

describe("POST /api/tickets", () => {
  it("API-01: creates a ticket with valid data and returns a Ticket Number", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(activeRequesterId))
      .field("categoryId", String(categoryId))
      .field("relatedSystemId", String(relatedSystemId))
      .field("summary", "Laptop battery drains quickly")
      .field("description", "The battery drains much faster than usual, even when idle.")
      .field("requestedPriority", "MEDIUM");

    expect(res.status).toBe(201);
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requesterId).toBe(activeRequesterId);
  });

  it("API-02: rejects a summary that is too short", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(activeRequesterId))
      .field("categoryId", String(categoryId))
      .field("relatedSystemId", String(relatedSystemId))
      .field("summary", "Hi")
      .field("description", "The battery drains much faster than usual, even when idle.")
      .field("requestedPriority", "MEDIUM");

    expect(res.status).toBe(400);
    expect(res.body.fields.summary).toBeDefined();
  });

  it("API-12: rejects requests from an inactive Development Requester (401)", async () => {
    const res = await request(app)
      .post("/api/tickets")
      .set("X-Dev-Requester-Id", String(inactiveRequesterId))
      .field("categoryId", String(categoryId))
      .field("relatedSystemId", String(relatedSystemId))
      .field("summary", "Valid summary text")
      .field("description", "Valid description text with enough length.")
      .field("requestedPriority", "LOW");

    expect(res.status).toBe(401);
  });

  it("API-12b: rejects requests missing the requester header (401)", async () => {
    const res = await request(app).post("/api/tickets").field("summary", "x");
    expect(res.status).toBe(401);
  });

  it("API-13: generates unique ticket numbers under concurrent creation", async () => {
    const makeReq = () =>
      request(app)
        .post("/api/tickets")
        .set("X-Dev-Requester-Id", String(activeRequesterId))
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
