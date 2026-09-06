import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

let requesterA: number;
let ticketId: number;

async function createBaseTicket() {
  const prisma = getPrisma();
  const category = await prisma.category.findFirst({ where: { isActive: true } });
  const relatedSystem = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
  const res = await request(app)
    .post("/api/tickets")
    .set("X-Dev-Requester-Id", String(requesterA))
    .field("categoryId", String(category!.id))
    .field("relatedSystemId", String(relatedSystem!.id))
    .field("summary", "Attachment lifecycle test ticket")
    .field("description", "A sufficiently long description for this test ticket.")
    .field("requestedPriority", "LOW");
  return res.body.id;
}

beforeAll(async () => {
  const prisma = getPrisma();
  const requester = await prisma.devRequester.findFirst({ where: { isActive: true } });
  requesterA = requester!.id;
  ticketId = await createBaseTicket();
});

describe("Attachment lifecycle", () => {
  it("API-03: rejects an unsupported file type with 415", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .attach("file", Buffer.from("not a real exe"), {
        filename: "malware.exe",
        contentType: "application/x-msdownload",
      });
    expect(res.status).toBe(415);
  });

  it("adds a valid attachment successfully", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .attach("file", Buffer.from("%PDF-1.4 fake pdf content"), {
        filename: "evidence.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(201);
    expect(res.body.originalFilename).toBe("evidence.pdf");
  });

  it("API-04: rejects a 6th active attachment with 409", async () => {
    for (let i = 0; i < 4; i++) {
      await request(app)
        .post(`/api/tickets/${ticketId}/attachments`)
        .set("X-Dev-Requester-Id", String(requesterA))
        .attach("file", Buffer.from("%PDF-1.4 filler"), {
          filename: `filler-${i}.pdf`,
          contentType: "application/pdf",
        });
    }
    const res = await request(app)
      .post(`/api/tickets/${ticketId}/attachments`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .attach("file", Buffer.from("%PDF-1.4 one too many"), {
        filename: "one-too-many.pdf",
        contentType: "application/pdf",
      });
    expect(res.status).toBe(409);
  });

  it("API-10/API-11: downloads an active attachment, then blocks it after soft removal", async () => {
    const attachRes = await request(app)
      .post(`/api/tickets/${await createBaseTicket()}/attachments`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .attach("file", Buffer.from("%PDF-1.4 downloadable"), {
        filename: "downloadable.pdf",
        contentType: "application/pdf",
      });
    const attachmentId = attachRes.body.id;

    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(requesterA));
    expect(downloadRes.status).toBe(200);

    const removeRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .send({ reason: "Wrong file attached" });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);

    const blockedDownload = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("X-Dev-Requester-Id", String(requesterA));
    expect(blockedDownload.status).toBe(404);
  });

  it("rejects removal without a reason", async () => {
    const attachRes = await request(app)
      .post(`/api/tickets/${await createBaseTicket()}/attachments`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .attach("file", Buffer.from("%PDF-1.4 needs reason"), {
        filename: "needs-reason.pdf",
        contentType: "application/pdf",
      });
    const res = await request(app)
      .delete(`/api/attachments/${attachRes.body.id}`)
      .set("X-Dev-Requester-Id", String(requesterA))
      .send({ reason: "" });
    expect(res.status).toBe(400);
  });
});
