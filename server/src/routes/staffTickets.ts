import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { requireAuth, requireFullAccess, requireRole, AuthedRequest } from "../middleware/requireAuth.js";
import { ticketToJson } from "./tickets.js";

export const staffTicketsRouter = Router();

const staffOnly = [requireAuth, requireFullAccess, requireRole("IT_STAFF", "ADMINISTRATOR")];

// GET /api/staff/tickets — FR-08, AC-06: cross-requester queue for IT Staff/Administrator.
staffTicketsRouter.get("/", ...staffOnly, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const { search, categoryId, requestedPriority, itPriority, status, ownerId, unassigned } = req.query;

  const allowedSort = new Set(["ticketNumber", "createdAt", "updatedAt"]);
  const sort = allowedSort.has(String(req.query.sort)) ? String(req.query.sort) : "createdAt";
  const order = req.query.order === "asc" ? "asc" : "desc";

  let page = Number(req.query.page);
  if (!Number.isInteger(page) || page < 1) page = 1;
  let pageSize = Number(req.query.pageSize);
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50) pageSize = 10;

  const where: any = {};
  if (search && typeof search === "string") {
    where.OR = [
      { ticketNumber: { contains: search, mode: "insensitive" } },
      { summary: { contains: search, mode: "insensitive" } },
    ];
  }
  if (categoryId) where.categoryId = Number(categoryId);
  if (requestedPriority) where.requestedPriority = requestedPriority;
  if (itPriority) where.itPriority = itPriority;
  if (status) where.currentStatus = status;
  if (unassigned === "true") where.ticketOwnerId = null;
  else if (ownerId) where.ticketOwnerId = Number(ownerId);

  try {
    const [totalItems, tickets] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.findMany({
        where,
        include: { ticketOwner: true },
        orderBy: { [sort]: order },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    res.status(200).json({
      data: tickets.map((t) => ticketToJson(t)),
      pagination: { page, pageSize, totalItems, totalPages: Math.max(1, Math.ceil(totalItems / pageSize)) },
    });
  } catch (err) {
    console.error("Failed to load staff queue:", err);
    res.status(500).json({ error: "Unable to load the ticket queue right now." });
  }
});

// GET /api/staff/tickets/assignees — active IT Staff/Administrator users who can own a ticket (BR-10).
// Must be declared BEFORE "/:id" so "assignees" is not parsed as a ticket id.
staffTicketsRouter.get("/assignees", ...staffOnly, async (_req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
    res.status(200).json(users);
  } catch (err) {
    console.error("Failed to load assignees:", err);
    res.status(500).json({ error: "Unable to load staff members right now." });
  }
});

// GET /api/staff/tickets/:id — full ticket for staff operations.
staffTicketsRouter.get("/:id", ...staffOnly, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const id = Number(req.params.id);
  if (!id) return res.status(404).json({ error: "Ticket not found" });

  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: { attachments: true, ticketOwner: true, requester: true },
  });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  res.status(200).json({
    ...ticketToJson(ticket),
    requesterName: ticket.requester.name,
  });
});

// PATCH /api/staff/tickets/:id/owner — claim/reassign (AC-07).
staffTicketsRouter.patch("/:id/owner", ...staffOnly, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const id = Number(req.params.id);
  const ownerId = req.body?.ownerId === null ? null : Number(req.body?.ownerId);

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  if (ownerId !== null && !Number.isInteger(ownerId)) {
    return res.status(400).json({ error: "Invalid owner" });
  }

  if (ownerId !== null) {
    const owner = await prisma.user.findFirst({
      where: { id: ownerId, isActive: true, role: { in: ["IT_STAFF", "ADMINISTRATOR"] } },
    });
    if (!owner) return res.status(400).json({ error: "Invalid owner" });
  }

  const updated = await prisma.ticket.update({
    where: { id },
    data: { ticketOwnerId: ownerId },
    include: { ticketOwner: true },
  });
  res.status(200).json(ticketToJson(updated));
});

// PATCH /api/staff/tickets/:id/priority — BR-11.
staffTicketsRouter.patch("/:id/priority", ...staffOnly, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const id = Number(req.params.id);
  const { itPriority } = req.body ?? {};
  if (!["LOW", "MEDIUM", "HIGH"].includes(itPriority)) {
    return res.status(400).json({ error: "Invalid IT Priority" });
  }

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const updated = await prisma.ticket.update({ where: { id }, data: { itPriority } });
  res.status(200).json(ticketToJson(updated));
});

// PATCH /api/staff/tickets/:id/status — BR-12 permitted-transition matrix.
const TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

staffTicketsRouter.patch("/:id/status", ...staffOnly, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const id = Number(req.params.id);
  const { status } = req.body ?? {};

  const ticket = await prisma.ticket.findUnique({ where: { id } });
  if (!ticket) return res.status(404).json({ error: "Ticket not found" });

  const allowed = TRANSITIONS[ticket.currentStatus] ?? [];
  if (!allowed.includes(status)) {
    return res.status(409).json({ error: `Cannot transition from ${ticket.currentStatus} to ${status}` });
  }

  const updated = await prisma.ticket.update({ where: { id }, data: { currentStatus: status } });
  res.status(200).json(ticketToJson(updated));
});

export { TRANSITIONS };
