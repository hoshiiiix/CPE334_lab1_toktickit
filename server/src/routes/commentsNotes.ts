import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireFullAccess, requireRole, AuthedRequest } from "../middleware/requireAuth.js";

export const commentsNotesRouter = Router();

async function getOwnedOrStaffTicket(prisma: any, ticketId: number, user: AuthedRequest["user"]) {
  if (user!.role === "REQUESTER") {
    return prisma.ticket.findFirst({ where: { id: ticketId, requesterId: user!.id } });
  }
  return prisma.ticket.findUnique({ where: { id: ticketId } });
}

// POST/GET /api/tickets/:id/comments — Requester (own) or staff (any).
commentsNotesRouter.post(
  "/tickets/:id/comments",
  requireAuth,
  requireFullAccess,
  async (req: AuthedRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.id);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (content.length < 1 || content.length > 2000) {
      return res.status(400).json({ error: "Comment must be 1-2000 characters" });
    }

    const ticket = await getOwnedOrStaffTicket(prisma, ticketId, req.user);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const comment = await prisma.publicComment.create({
      data: { ticketId, authorId: req.user!.id, content },
      include: { author: true },
    });
    res.status(201).json({
      id: comment.id,
      authorId: comment.authorId,
      authorName: comment.author.name,
      authorRole: comment.author.role,
      content: comment.content,
      createdAt: comment.createdAt,
    });
  }
);

commentsNotesRouter.get(
  "/tickets/:id/comments",
  requireAuth,
  requireFullAccess,
  async (req: AuthedRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.id);
    const ticket = await getOwnedOrStaffTicket(prisma, ticketId, req.user);
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const comments = await prisma.publicComment.findMany({
      where: { ticketId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(
      comments.map((c: any) => ({
        id: c.id, authorId: c.authorId, authorName: c.author.name,
        authorRole: c.author.role, content: c.content, createdAt: c.createdAt,
      }))
    );
  }
);

// POST/GET /api/tickets/:id/notes — IT Staff/Administrator only (BR-04, AC-05).
commentsNotesRouter.post(
  "/tickets/:id/notes",
  requireAuth,
  requireFullAccess,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthedRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.id);
    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";

    if (content.length < 1 || content.length > 2000) {
      return res.status(400).json({ error: "Note must be 1-2000 characters" });
    }

    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return res.status(404).json({ error: "Ticket not found" });

    const note = await prisma.internalNote.create({
      data: { ticketId, authorId: req.user!.id, content },
      include: { author: true },
    });
    res.status(201).json({
      id: note.id, authorId: note.authorId, authorName: note.author.name,
      content: note.content, createdAt: note.createdAt,
    });
  }
);

commentsNotesRouter.get(
  "/tickets/:id/notes",
  requireAuth,
  requireFullAccess,
  requireRole("IT_STAFF", "ADMINISTRATOR"),
  async (req: AuthedRequest, res: Response) => {
    const prisma = getPrisma();
    const ticketId = Number(req.params.id);
    const notes = await prisma.internalNote.findMany({
      where: { ticketId },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });
    res.status(200).json(
      notes.map((n: any) => ({
        id: n.id, authorId: n.authorId, authorName: n.author.name,
        content: n.content, createdAt: n.createdAt,
      }))
    );
  }
);
