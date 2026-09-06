import { Router, Response } from "express";
import path from "path";
import fs from "fs";
import { getPrisma } from "../prisma.js";
import { requireDevRequester, RequesterRequest } from "../middleware/requireDevRequester.js";
import { upload, UPLOAD_DIR, MAX_ACTIVE_ATTACHMENTS } from "./tickets.js";

export const attachmentsRouter = Router();

// POST /api/tickets/:ticketId/attachments — FR-08, AC-06..AC-08
attachmentsRouter.post(
  "/tickets/:ticketId/attachments",
  requireDevRequester,
  (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        if (err.message === "UNSUPPORTED_TYPE") {
          return res.status(415).json({ error: "Unsupported attachment type" });
        }
        if (err.code === "LIMIT_FILE_SIZE") {
          return res.status(413).json({ error: "Attachment exceeds the 5MB limit" });
        }
        return res.status(400).json({ error: "Attachment upload failed" });
      }
      next();
    });
  },
  async (req: RequesterRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.ticketId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "No file provided" });
    }

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.requesterId },
    });
    if (!ticket) {
      fs.unlink(file.path, () => {});
      return res.status(404).json({ error: "Ticket not found" });
    }

    const activeCount = await prisma.attachment.count({
      where: { ticketId, isRemoved: false },
    });
    if (activeCount >= MAX_ACTIVE_ATTACHMENTS) {
      fs.unlink(file.path, () => {});
      return res
        .status(409)
        .json({ error: "Ticket already has the maximum of 5 active attachments" });
    }

    try {
      const attachment = await prisma.attachment.create({
        data: {
          ticketId,
          originalFilename: file.originalname,
          storedFilename: file.filename,
          mimeType: file.mimetype,
          sizeBytes: file.size,
        },
      });
      res.status(201).json({
        id: attachment.id,
        originalFilename: attachment.originalFilename,
        mimeType: attachment.mimeType,
        sizeBytes: attachment.sizeBytes,
        uploadedAt: attachment.uploadedAt,
        isRemoved: false,
      });
    } catch (err) {
      console.error("Failed to add attachment:", err);
      fs.unlink(file.path, () => {});
      res.status(500).json({ error: "Unable to add attachment right now." });
    }
  }
);

// GET /api/tickets/:ticketId/attachments — list metadata
attachmentsRouter.get(
  "/tickets/:ticketId/attachments",
  requireDevRequester,
  async (req: RequesterRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.ticketId);

    const ticket = await prisma.ticket.findFirst({
      where: { id: ticketId, requesterId: req.requesterId },
    });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const attachments = await prisma.attachment.findMany({
      where: { ticketId },
      orderBy: { uploadedAt: "asc" },
    });
    res.status(200).json(
      attachments.map((a) => ({
        id: a.id,
        originalFilename: a.originalFilename,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        uploadedAt: a.uploadedAt,
        isRemoved: a.isRemoved,
        removedAt: a.removedAt,
        removedReason: a.removedReason,
      }))
    );
  }
);

// GET /api/attachments/:id/download — AC-16, AC-17 (never serve removed files)
attachmentsRouter.get(
  "/attachments/:id/download",
  requireDevRequester,
  async (req: RequesterRequest, res: Response) => {
    const prisma = getPrisma();
    const id = Number(req.params.id);

    const attachment = await prisma.attachment.findFirst({
      where: { id, isRemoved: false, ticket: { requesterId: req.requesterId } },
    });
    if (!attachment) return res.status(404).json({ error: "Attachment not found" });

    const filePath = path.join(UPLOAD_DIR, attachment.storedFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Attachment not found" });
    }
    res.download(filePath, attachment.originalFilename);
  }
);

// DELETE /api/attachments/:id — AC-18, soft removal with reason
attachmentsRouter.delete(
  "/attachments/:id",
  requireDevRequester,
  async (req: RequesterRequest, res: Response) => {
    const prisma = getPrisma();
    const id = Number(req.params.id);
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : "";

    if (reason.length < 3 || reason.length > 200) {
      return res.status(400).json({ error: "A removal reason of 3-200 characters is required" });
    }

    const attachment = await prisma.attachment.findFirst({
      where: { id, isRemoved: false, ticket: { requesterId: req.requesterId } },
    });
    if (!attachment) {
      return res.status(404).json({ error: "Attachment not found" });
    }

    const updated = await prisma.attachment.update({
      where: { id },
      data: { isRemoved: true, removedAt: new Date(), removedReason: reason },
    });

    res.status(200).json({
      id: updated.id,
      isRemoved: updated.isRemoved,
      removedAt: updated.removedAt,
      removedReason: updated.removedReason,
    });
  }
);
