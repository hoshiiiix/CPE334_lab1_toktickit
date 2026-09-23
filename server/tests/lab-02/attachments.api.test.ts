import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
let agentA: any;
let ticketId: number;

async function loginAs(email: string) {
  const agent = request.agent(app);
  await agent.post("/api/auth/login").send({ email, password: DEV_PASSWORD });
  return agent;
}

async function createBaseTicket() {
  const prisma = getPrisma();
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  const res = await agentA
    .post("/api/tickets")
    .field("categoryId", String(category!.id))
    .field("relatedSystemId", String(relatedSystem!.id))
    .field("summary", "Attachment lifecycle test ticket")
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
  return res.body.id;
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requester = await prisma.user.findFirst({ where: { isActive: true, role: "REQUESTER" } });
  agentA = await loginAs(requester!.email);
  ticketId = await createBaseTicket();
});

describe("Attachment lifecycle", () => {
  it("API-03: rejects an unsupported file type with 415", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("not a real exe"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });
    expect(res.status).toBe(415);
  });

  it("adds a valid attachment successfully", async () => {
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 fake pdf content"), {
        filename: "evidence.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("evidence.pdf");
  });

  it("API-04: rejects a 6th active attachment with 409", async () => {
    for (let i = 0; i < 4; i++) {
      await agentA
        .post(`/api/tickets/${ticketId}/attachments`)
        .attach("file", Buffer.from("%PDF-1.4 filler"), {
          filename: `filler-${i}.pdf`,
          contentType: "application/pdf",
        });
    }
    const res = await agentA
      .post(`/api/tickets/${ticketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 one too many"), {
        filename: "one-too-many.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(409);
  });

  it("API-10/API-11: downloads an active attachment, then blocks it after soft removal", async () => {
    const newTicketId = await createBaseTicket();
    const attachRes = await agentA
      .post(`/api/tickets/${newTicketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 downloadable"), {
        filename: "downloadable.pdf",
        contentType: "application/pdf",
      });
    const attachmentId = attachRes.body.id;

    const downloadRes = await agentA.get(`/api/attachments/${attachmentId}/download`);
    expect(downloadRes.status).toBe(200);

    const removeRes = await agentA
      .delete(`/api/attachments/${attachmentId}`)
      .send({ reason: "Wrong file attached" });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    const blockedDownload = await agentA.get(`/api/attachments/${attachmentId}/download`);
    expect(blockedDownload.status).toBe(404);
  });

  it("rejects removal without a reason", async () => {
    const newTicketId = await createBaseTicket();
    const attachRes = await agentA
      .post(`/api/tickets/${newTicketId}/attachments`)
      .attach("file", Buffer.from("%PDF-1.4 needs reason"), {
        filename: "needs-reason.pdf",
        contentType: "application/pdf",
      });
    const res = await agentA.delete(`/api/attachments/${attachRes.body.id}`).send({ reason: "" });
    expect(res.status).toBe(400);
  });
});
