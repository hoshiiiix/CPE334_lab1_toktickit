import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export interface RequesterRequest extends Request {
  requesterId?: number;
}

// BR-03/BR-16: every requester-scoped route requires a valid, active
// X-Dev-Requester-Id header. This is a TESTING mechanism only, not authentication.
export async function requireDevRequester(
  req: RequesterRequest,
  res: Response,
  next: NextFunction
) {
  const raw = req.header("X-Dev-Requester-Id");
  const requesterId = raw ? Number(raw) : NaN;

  if (!raw || Number.isNaN(requesterId)) {
    return res.status(401).json({ error: "Development Requester not selected" });
  }

  const requester = await getPrisma().devRequester.findUnique({
    where: { id: requesterId },
  });

  if (!requester || !requester.isActive) {
    return res.status(401).json({ error: "Invalid Development Requester" });
  }

  req.requesterId = requesterId;
  next();
}
