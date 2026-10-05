import { Request, Response, NextFunction } from "express";
import { getPrisma } from "../prisma.js";

export const SESSION_COOKIE = "toktickit_session";
export const SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000; // BR-08: 7 days

export interface AuthedUser {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  mustChangePassword: boolean;
}

export interface AuthedRequest extends Request {
  user?: AuthedUser;
}

// BR-08: reads the httpOnly session cookie, loads the session + user, and
// rejects if missing/expired/inactive user. Does NOT enforce mustChangePassword
// or role — see requireFullAccess/requireRole below for those layers.
export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (!sessionId) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const prisma = getPrisma();
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  req.user = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as AuthedUser["role"],
    mustChangePassword: session.user.mustChangePassword,
  };
  next();
}

// BR-02: blocks every endpoint except auth/me/logout/change-password while a
// password change is pending. Apply AFTER requireAuth.
export function requireFullAccess(req: AuthedRequest, res: Response, next: NextFunction) {
  if (req.user?.mustChangePassword) {
    return res.status(403).json({ error: "Password change required" });
  }
  next();
}

// Apply AFTER requireAuth + requireFullAccess. Usage: requireRole("IT_STAFF", "ADMINISTRATOR")
export function requireRole(...roles: AuthedUser["role"][]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    next();
  };
}
