import { Router, Response } from "express";
import { getPrisma } from "../prisma.js";
import { hashPassword, validatePasswordPolicy } from "../utils/password.js";
import {
  requireAuth,
  requireFullAccess,
  requireRole,
  AuthedRequest,
  SESSION_COOKIE,
} from "../middleware/requireAuth.js";

export const adminUsersRouter = Router();

const adminOnly = [requireAuth, requireFullAccess, requireRole("ADMINISTRATOR")];

const ROLES = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"] as const;
type RoleValue = (typeof ROLES)[number];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME = 100;
const MAX_EMAIL = 254;

function userToJson(u: any) {
  return {
    id: u.id, name: u.name, email: u.email, role: u.role,
    isActive: u.isActive, mustChangePassword: u.mustChangePassword,
  };
}

function validationError(res: Response, fields: Record<string, string>, message?: string) {
  return res.status(400).json({ error: message ?? "Please correct the highlighted fields", fields });
}

function checkName(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return "Name is required";
  if (value.trim().length > MAX_NAME) return `Name must be at most ${MAX_NAME} characters`;
  return null;
}

function checkEmail(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) return "Email is required";
  const email = value.trim();
  if (email.length > MAX_EMAIL || !EMAIL_RE.test(email)) return "Enter a valid email address";
  return null;
}

function checkRole(value: unknown): string | null {
  if (typeof value !== "string" || !ROLES.includes(value as RoleValue)) return "Select a valid role";
  return null;
}

// BR-09: one email namespace, compared case-insensitively.
async function emailTaken(email: string, excludeId?: number) {
  const found = await getPrisma().user.findFirst({
    where: {
      email: { equals: email, mode: "insensitive" },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return found !== null;
}

// GET /api/admin/users — list with optional name/email search and role filter.
adminUsersRouter.get("/", ...adminOnly, async (req: AuthedRequest, res: Response) => {
  const { search, role } = req.query;

  if (role !== undefined && role !== "" && !ROLES.includes(role as RoleValue)) {
    return res.status(400).json({ error: "Invalid role filter" });
  }

  const where: any = {};
  if (typeof search === "string" && search.trim()) {
    where.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { email: { contains: search.trim(), mode: "insensitive" } },
    ];
  }
  if (typeof role === "string" && role) where.role = role;

  try {
    const users = await getPrisma().user.findMany({ where, orderBy: { name: "asc" } });
    res.status(200).json(users.map(userToJson));
  } catch (err) {
    console.error("Failed to list users:", err);
    res.status(500).json({ error: "Unable to load users right now." });
  }
});

// POST /api/admin/users — create a user with exactly one role (BR-14).
adminUsersRouter.post("/", ...adminOnly, async (req: AuthedRequest, res: Response) => {
  const { name, email, role, isActive, initialPassword } = req.body ?? {};

  const fields: Record<string, string> = {};
  const nameError = checkName(name);
  if (nameError) fields.name = nameError;
  const emailError = checkEmail(email);
  if (emailError) fields.email = emailError;
  const roleError = checkRole(role);
  if (roleError) fields.role = roleError;
  if (isActive !== undefined && typeof isActive !== "boolean") fields.isActive = "Must be true or false";
  const passwordError = typeof initialPassword === "string"
    ? validatePasswordPolicy(initialPassword)
    : "Initial password is required";
  if (passwordError) fields.initialPassword = passwordError;
  if (Object.keys(fields).length > 0) return validationError(res, fields);

  try {
    const cleanEmail = (email as string).trim();
    if (await emailTaken(cleanEmail)) {
      return validationError(res, { email: "This email address is already in use" });
    }

    const user = await getPrisma().user.create({
      data: {
        name: (name as string).trim(),
        email: cleanEmail,
        role,
        isActive: isActive ?? true,
        passwordHash: await hashPassword(initialPassword),
        mustChangePassword: true, // BR-14: always changed at first login
      },
    });
    res.status(201).json(userToJson(user));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return validationError(res, { email: "This email address is already in use" });
    }
    console.error("Failed to create user:", err);
    res.status(500).json({ error: "Unable to create the user right now." });
  }
});

// PATCH /api/admin/users/:id — name, email, role, activation state only.
adminUsersRouter.patch("/:id", ...adminOnly, async (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: "User not found" });

  const body = req.body ?? {};
  const { name, email, role, isActive } = body;

  const fields: Record<string, string> = {};
  if (name !== undefined) { const e = checkName(name); if (e) fields.name = e; }
  if (email !== undefined) { const e = checkEmail(email); if (e) fields.email = e; }
  if (role !== undefined) { const e = checkRole(role); if (e) fields.role = e; }
  if (isActive !== undefined && typeof isActive !== "boolean") fields.isActive = "Must be true or false";
  if (Object.keys(fields).length > 0) return validationError(res, fields);

  if (name === undefined && email === undefined && role === undefined && isActive === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "User not found" });

    // BR-16: an Administrator cannot deactivate their own account.
    if (isActive === false && target.id === req.user!.id) {
      const msg = "You cannot deactivate your own account";
      return validationError(res, { isActive: msg }, msg);
    }

    // BR-16: the system must always keep at least one active Administrator.
    const newRole = role ?? target.role;
    const newActive = isActive ?? target.isActive;
    const wasActiveAdmin = target.role === "ADMINISTRATOR" && target.isActive;
    const staysActiveAdmin = newRole === "ADMINISTRATOR" && newActive;
    if (wasActiveAdmin && !staysActiveAdmin) {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true, id: { not: target.id } },
      });
      if (otherActiveAdmins === 0) {
        const field = role !== undefined && role !== "ADMINISTRATOR" ? "role" : "isActive";
        const msg = "At least one active Administrator is required";
        return validationError(res, { [field]: msg }, msg);
      }
    }

    if (email !== undefined && (await emailTaken(email.trim(), target.id))) {
      return validationError(res, { email: "This email address is already in use" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(email !== undefined ? { email: email.trim() } : {}),
        ...(role !== undefined ? { role } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    // A deactivated account loses every open session immediately.
    if (isActive === false) await prisma.session.deleteMany({ where: { userId: id } });

    res.status(200).json(userToJson(updated));
  } catch (err: any) {
    if (err?.code === "P2002") {
      return validationError(res, { email: "This email address is already in use" });
    }
    console.error("Failed to update user:", err);
    res.status(500).json({ error: "Unable to update the user right now." });
  }
});

// POST /api/admin/users/:id/reset-password — new initial password, changed at next login.
adminUsersRouter.post("/:id/reset-password", ...adminOnly, async (req: AuthedRequest, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return res.status(404).json({ error: "User not found" });

  const { newInitialPassword } = req.body ?? {};
  const passwordError = typeof newInitialPassword === "string"
    ? validatePasswordPolicy(newInitialPassword)
    : "New initial password is required";
  if (passwordError) return validationError(res, { newInitialPassword: passwordError });

  try {
    const prisma = getPrisma();
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return res.status(404).json({ error: "User not found" });

    await prisma.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(newInitialPassword), mustChangePassword: true },
    });

    // Old sessions must not outlive the old password. When an Administrator resets
    // their own password, keep the current session so they can complete the change.
    const currentSessionId = req.cookies?.[SESSION_COOKIE];
    await prisma.session.deleteMany({
      where: {
        userId: id,
        ...(id === req.user!.id && currentSessionId ? { id: { not: currentSessionId } } : {}),
      },
    });

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Failed to reset password:", err);
    res.status(500).json({ error: "Unable to set the password right now." });
  }
});
