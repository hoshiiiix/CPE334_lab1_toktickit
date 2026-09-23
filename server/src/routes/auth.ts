import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "../utils/password.js";
import {
  requireAuth,
  AuthedRequest,
  SESSION_COOKIE,
  SESSION_LIFETIME_MS,
} from "../middleware/requireAuth.js";

export const authRouter = Router();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // BR-07: 15 minutes

// POST /api/auth/login
authRouter.post("/login", async (req, res: Response) => {
  const prisma = getPrisma();
  const { email, password } = req.body ?? {};

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  // BR-07: rate-limit by email regardless of whether the account exists.
  const since = new Date(Date.now() - WINDOW_MS);
  const recentFailures = await prisma.loginAttempt.count({
    where: { email, succeeded: false, createdAt: { gte: since } },
  });
  if (recentFailures >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const passwordOk = user ? await verifyPassword(password, user.passwordHash) : false;

  if (!user || !user.isActive || !passwordOk) {
    // BR-01/AC-02: identical generic message for wrong password, unknown
    // email, and inactive account — never reveal which case applied.
    await prisma.loginAttempt.create({
      data: { email, succeeded: false, userId: user?.id },
    });
    return res.status(401).json({ error: "Invalid email or password" });
  }

  await prisma.loginAttempt.create({ data: { email, succeeded: true, userId: user.id } });

  const session = await prisma.session.create({
    data: { userId: user.id, expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS) },
  });

  res.cookie(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: SESSION_LIFETIME_MS,
  });

  res.status(200).json({
    id: user.id,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  });
});

// POST /api/auth/logout
authRouter.post("/logout", async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const sessionId = req.cookies?.[SESSION_COOKIE];
  if (sessionId) {
    await prisma.session.deleteMany({ where: { id: sessionId } });
  }
  res.clearCookie(SESSION_COOKIE);
  res.status(200).json({ success: true });
});

// GET /api/auth/me
authRouter.get("/me", requireAuth, (req: AuthedRequest, res: Response) => {
  res.status(200).json(req.user);
});

// POST /api/auth/change-password — reachable even while mustChangePassword=true
authRouter.post("/change-password", requireAuth, async (req: AuthedRequest, res: Response) => {
  const prisma = getPrisma();
  const { currentPassword, newPassword, confirmPassword } = req.body ?? {};

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match", fields: { confirmPassword: "Must match new password" } });
  }
  const policyError = validatePasswordPolicy(newPassword ?? "");
  if (policyError) {
    return res.status(400).json({ error: policyError, fields: { newPassword: policyError } });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  const currentOk = user && (await verifyPassword(currentPassword ?? "", user.passwordHash));
  if (!currentOk) {
    return res.status(400).json({ error: "Current password is incorrect", fields: { currentPassword: "Incorrect" } });
  }

  await prisma.user.update({
    where: { id: req.user!.id },
    data: { passwordHash: await hashPassword(newPassword), mustChangePassword: false },
  });

  res.status(200).json({ success: true });
});
