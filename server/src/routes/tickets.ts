import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireFullAccess, AuthedRequest } from "../middleware/requireAuth.js";
import { withTicketNumberRetry } from "../utils/ticketNumber.js";

export const ticketsRouter = Router();

const UPLOAD_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ACTIVE_ATTACHMENTS = 5;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error("UNSUPPORTED_TYPE"));
      return;
    }
    cb(null, true);
  },
});

function ticketToJson(t: any) {
  return {
    id: t.id,
    ticketNumber: t.ticketNumber,
    requesterId: t.requesterId,
    ticketOwnerId: t.ticketOwnerId,
    ticketOwnerName: t.ticketOwner?.name ?? null,
    categoryId: t.categoryId,
    relatedSystemId: t.relatedSystemId,
    summary: t.summary,
    description: t.description,
    requestedPriority: t.requestedPriority,
    itPriority: t.itPriority,
    currentStatus: t.currentStatus,
    requesterMarkedResolved: t.requesterMarkedResolved,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
    attachments: (t.attachments ?? []).map((a: any) => ({
      id: a.id,
      originalFilename: a.originalFilename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      uploadedAt: a.uploadedAt,
      isRemoved: a.isRemoved,
      removedAt: a.removedAt,
      removedReason: a.removedReason,
    })),
  };
}

// POST /api/tickets — BR-06 (Lab3): requesterId always comes from the session.
ticketsRouter.post(
  "/",
  requireAuth,
  requireFullAccess,
  (req, res, next) => {
    upload.array("attachments", MAX_ACTIVE_ATTACHMENTS)(req, res, (err: any) => {
      if (err) {
        if (err.message === "UNSUPPORTED_TYPE") {
          return res.status(415).json({
            error: "Unsupported attachment type",
            fields: { attachments: "Only JPG, PNG, WEBP, and PDF files are allowed." },
          });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Attachment exceeds the 5MB limit" });
        }
        return res.status(400).json({ error: "Attachment upload failed" });
      }
      next();
    });
  },
  async (req: AuthedRequest, res: Response) => {
    const prisma = getPrisma();
    const { categoryId, relatedSystemId, summary, description, requestedPriority } = req.body;
    const files = (req.files as Express.Multer.File[]) ?? [];

    const fields: Record<string, string> = {};
    const trimmedSummary = typeof summary === "string" ? summary.trim() : "";
    const trimmedDescription = typeof description === "string" ? description.trim() : "";

    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      fields.summary = "Summary must be 5-120 characters";
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      fields.description = "Description must be 10-2000 characters";
    }
    if (!["LOW", "MEDIUM", "HIGH"].includes(requestedPriority)) {
      fields.requestedPriority = "Requested priority must be LOW, MEDIUM, or HIGH";
    }
    const categoryIdNum = Number(categoryId);
    const relatedSystemIdNum = Number(relatedSystemId);
    if (!categoryIdNum) fields.categoryId = "Category is required";
    if (!relatedSystemIdNum) fields.relatedSystemId = "Related System is required";

    if (Object.keys(fields).length > 0) {
      for (const f of files) fs.unlink(f.path, () => {});
      return res.status(400).json({ error: "Validation failed", fields });
    }

    const [category, relatedSystem] = await Promise.all([
      prisma.category.findFirst({ where: { id: categoryIdNum, isActive: true } }),
      prisma.relatedSystem.findFirst({ where: { id: relatedSystemIdNum, isActive: true } }),
    ]);
    if (!category) fields.categoryId = "Category is invalid or inactive";
    if (!relatedSystem) fields.relatedSystemId = "Related System is invalid or inactive";
    if (Object.keys(fields).length > 0) {
      for (const f of files) fs.unlink(f.path, () => {});
      return res.status(400).json({ error: "Validation failed", fields });
    }

    try {
      const ticket = await withTicketNumberRetry(prisma, ({ ticketNumber, ticketYear, yearSequence }) =>
        prisma.ticket.create({
          data: {
            ticketNumber,
            ticketYear,
            yearSequence,
            requesterId: req.user!.id, // BR-03/BR-06 (Lab3): session identity only
            categoryId: categoryIdNum,
            relatedSystemId: relatedSystemIdNum,
            summary: trimmedSummary,
            description: trimmedDescription,
            requestedPriority,
          },
        })
      );

      const failedAttachments: string[] = [];
      const savedAttachments = [];
      for (const file of files) {
        try {
          const attachment = await prisma.attachment.create({
            data: {
              ticketId: ticket.id,
              originalFilename: file.originalname,
              storedFilename: file.filename,
              mimeType: file.mimetype,
              sizeBytes: file.size,
            },
          });
          savedAttachments.push(attachment);
        } catch (e) {
          failedAttachments.push(file.originalname);
        }
      }

      res.status(201).json({
        ...ticketToJson({ ...ticket, attachments: savedAttachments }),
        failedAttachments,
      });
    } catch (err) {
      console.error("Failed to create ticket:", err);
      for (const f of files) fs.unlink(f.path, () => {});
      res.status(500).json({ error: "Unable to create ticket right now." });
    }
  }
);

// GET /api/tickets — Requester's own tickets, scoped by session identity.
ticketsRouter.get("/", requireAuth, requireFullAccess, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const { search, categoryId, requestedPriority, status } = req.query;

  const allowedSort = new Set(["ticketNumber", "createdAt", "updatedAt"]);
  const sort = allowedSort.has(String(req.query.sort)) ? String(req.query.sort) : "createdAt";
  const order = req.query.order === "asc" ? "asc" : "desc";

  let page = Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;
  let pageSize = Number(req.query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) pageSize = 10;

  const where: any = { requesterId: req.user!.id };
  if (search && typeof search === "string") {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = Number(categoryId);
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (status) where.currentStatus = status;

  try {
    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.status(200).json({
      data: tickets.map((t) => ticketToJson(t)),
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
    });
  } catch (err) {
    console.error("Failed to list tickets:", err);
    res.status(500).json({ error: "Unable to load tickets right now." });
  }
});

// GET /api/tickets/:id — owned by the current Requester only.
ticketsRouter.get("/:id", requireAuth, requireFullAccess, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const id = Number(req.params.id);
  if (!id) return res.status(404).json({ error: "Ticket not found" });

  try {
    const ticket = await prisma.ticket.findFirst({
      where: { id, requesterId: req.user!.id },
      include: { attachments: true, ticketOwner: true },
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    res.status(200).json(ticketToJson(ticket));
  } catch (err) {
    console.error("Failed to load ticket:", err);
    res.status(500).json({ error: "Unable to load ticket right now." });
  }
});

// PATCH /api/tickets/:id/mark-resolved — Requester, own ticket only (BR-05).
ticketsRouter.patch(
  "/:id/mark-resolved",
  requireAuth,
  requireFullAccess,
  async (req: AuthedRequest, res: Response) => {
    if (req.user!.role !== "REQUESTER") {
      return res.status(403).json({ error: "Forbidden" });
    }
    const prisma = getPrisma();
    const id = Number(req.params.id);
    const ticket = await prisma.ticket.findFirst({ where: { id, requesterId: req.user!.id } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const updated = await prisma.ticket.update({
      where: { id },
      data: { requesterMarkedResolved: true },
    });
    res.status(200).json({ requesterMarkedResolved: updated.requesterMarkedResolved });
  }
);

export { UPLOAD_DIR, upload, MAX_ACTIVE_ATTACHMENTS, ticketToJson };
