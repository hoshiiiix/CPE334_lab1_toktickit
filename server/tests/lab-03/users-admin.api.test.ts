import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

const DEV_PASSWORD = "DevPass123!";
const INITIAL_PASSWORD = "Initial#Pass1";
const RUN = Date.now();
const createdEmails: string[] = [];

let admin: any;
let adminUser: any;
let staff: any;
let requester: any;

async function loginAs(email: string, password = DEV_PASSWORD) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ email, password });
  return { agent, res };
}

function uniqueEmail(tag: string) {
  const email = `admin-test-${tag}-${RUN}@example.com`;
  createdEmails.push(email);
  return email;
}

async function createUser(overrides: Record<string, unknown> = {}) {
  const email = (overrides.email as string) ?? uniqueEmail(Math.random().toString(36).slice(2, 8));
  if (!createdEmails.includes(email)) createdEmails.push(email);
  const res = await admin.post("/api/admin/users").send({
    name: "Test Created User",
    email,
    role: "REQUESTER",
    isActive: true,
    initialPassword: INITIAL_PASSWORD,
    ...overrides,
  });
  return { res, email };
}

beforeAll(async () => {
  const prisma = getPrisma();
  adminUser = await prisma.user.findFirst({ where: { role: "ADMINISTRATOR", isActive: true } });
  const staffUser = await prisma.user.findFirst({ where: { role: "IT_STAFF", isActive: true } });
  const requesterUser = await prisma.user.findFirst({ where: { role: "REQUESTER", isActive: true } });

  admin = (await loginAs(adminUser.email)).agent;
  staff = (await loginAs(staffUser!.email)).agent;
  requester = (await loginAs(requesterUser!.email)).agent;
});

afterAll(async () => {
  const prisma = getPrisma();
  const users = await prisma.user.findMany({
    where: { email: { in: createdEmails.map((e) => e) } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.loginAttempt.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

describe("GET /api/admin/users (list, search, role filter)", () => {
  it("API-20: returns users with the list fields and never a password hash", async () => {
    const res = await admin.get("/api/admin/users");
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    for (const u of res.body) {
      expect(u).toHaveProperty("name");
      expect(u).toHaveProperty("email");
      expect(u).toHaveProperty("role");
      expect(u).toHaveProperty("isActive");
      expect(u).not.toHaveProperty("passwordHash");
    }
  });

  it("searches by name or email, case-insensitively", async () => {
    const byName = await admin.get("/api/admin/users").query({ search: "JOHN SMITH" });
    expect(byName.body.some((u: any) => u.email === adminUser.email)).toBe(true);

    const byEmail = await admin.get("/api/admin/users").query({ search: adminUser.email.slice(0, 8) });
    expect(byEmail.body.some((u: any) => u.id === adminUser.id)).toBe(true);
  });

  it("returns an empty list (not an error) when nothing matches", async () => {
    const res = await admin.get("/api/admin/users").query({ search: "zzz-no-such-user-zzz" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("filters by role and rejects an invalid role value", async () => {
    const staffOnly = await admin.get("/api/admin/users").query({ role: "IT_STAFF" });
    expect(staffOnly.status).toBe(200);
    expect(staffOnly.body.length).toBeGreaterThan(0);
    expect(staffOnly.body.every((u: any) => u.role === "IT_STAFF")).toBe(true);

    const invalid = await admin.get("/api/admin/users").query({ role: "SUPERUSER" });
    expect(invalid.status).toBe(400);
  });
});

describe("POST /api/admin/users (create)", () => {
  it("creates a user with one role and forces a password change at first login (BR-14)", async () => {
    const { res, email } = await createUser({ name: "Created Staff", role: "IT_STAFF" });
    expect(res.status).toBe(201);
    expect(res.body.role).toBe("IT_STAFF");
    expect(res.body.mustChangePassword).toBe(true);
    expect(res.body).not.toHaveProperty("passwordHash");

    const { res: login } = await loginAs(email, INITIAL_PASSWORD);
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);
  });

  it("API-15/AC-10: rejects a duplicate email with a field-level error and creates nothing", async () => {
    const { email } = await createUser({ name: "First Copy" });
    const before = await getPrisma().user.count();

    const dup = await createUser({ email, name: "Second Copy" });
    expect(dup.res.status).toBe(400);
    expect(dup.res.body.fields.email).toMatch(/already in use/i);

    const sameDifferentCase = await createUser({ email: email.toUpperCase(), name: "Third Copy" });
    expect(sameDifferentCase.res.status).toBe(400);
    expect(sameDifferentCase.res.body.fields.email).toMatch(/already in use/i);

    expect(await getPrisma().user.count()).toBe(before);
  });

  it("rejects an invalid role, a missing name, a bad email and a weak initial password", async () => {
    const badRole = await createUser({ role: "SUPERUSER" });
    expect(badRole.res.status).toBe(400);
    expect(badRole.res.body.fields.role).toBeDefined();

    const noName = await createUser({ name: "   " });
    expect(noName.res.status).toBe(400);
    expect(noName.res.body.fields.name).toBeDefined();

    const badEmail = await createUser({ email: "not-an-email" });
    expect(badEmail.res.status).toBe(400);
    expect(badEmail.res.body.fields.email).toBeDefined();

    const weak = await createUser({ initialPassword: "weak" });
    expect(weak.res.status).toBe(400);
    expect(weak.res.body.fields.initialPassword).toBeDefined();
  });

  it("can create an inactive account, which cannot log in (BR-01)", async () => {
    const { res, email } = await createUser({ isActive: false });
    expect(res.status).toBe(201);
    expect(res.body.isActive).toBe(false);

    const { res: login } = await loginAs(email, INITIAL_PASSWORD);
    expect(login.status).toBe(401);
  });
});

describe("PATCH /api/admin/users/:id (edit, activation, one role)", () => {
  it("edits name, email, role and activation state", async () => {
    const { res: created } = await createUser({ name: "Before Edit", role: "REQUESTER" });
    const newEmail = uniqueEmail("renamed");

    const res = await admin
      .patch(`/api/admin/users/${created.body.id}`)
      .send({ name: "After Edit", email: newEmail, role: "IT_STAFF", isActive: false });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "After Edit", email: newEmail, role: "IT_STAFF", isActive: false });
  });

  it("rejects a duplicate email and an invalid role on edit", async () => {
    const a = await createUser({ name: "Edit Dup A" });
    const b = await createUser({ name: "Edit Dup B" });

    const dup = await admin.patch(`/api/admin/users/${b.res.body.id}`).send({ email: a.email });
    expect(dup.status).toBe(400);
    expect(dup.body.fields.email).toMatch(/already in use/i);

    const badRole = await admin.patch(`/api/admin/users/${b.res.body.id}`).send({ role: "ROOT" });
    expect(badRole.status).toBe(400);
  });

  it("allows saving a user with their own unchanged email", async () => {
    const { res: created, email } = await createUser({ name: "Same Email" });
    const res = await admin.patch(`/api/admin/users/${created.body.id}`).send({ email, name: "Same Email 2" });
    expect(res.status).toBe(200);
  });

  it("returns 404 for an unknown or non-numeric user id and 400 for an empty change", async () => {
    expect((await admin.patch("/api/admin/users/999999").send({ name: "X" })).status).toBe(404);
    expect((await admin.patch("/api/admin/users/abc").send({ name: "X" })).status).toBe(404);

    const { res: created } = await createUser();
    expect((await admin.patch(`/api/admin/users/${created.body.id}`).send({})).status).toBe(400);
  });

  it("API-16/AC-11/BR-16: an Administrator cannot deactivate their own account", async () => {
    const res = await admin.patch(`/api/admin/users/${adminUser.id}`).send({ isActive: false });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/cannot deactivate your own account/i);

    const still = await getPrisma().user.findUnique({ where: { id: adminUser.id } });
    expect(still!.isActive).toBe(true);
  });

  it("BR-16: the last active Administrator cannot be demoted, and a second admin can be deactivated", async () => {
    const prisma = getPrisma();
    // Make this deterministic: temporarily deactivate every other Administrator, then restore them.
    const others = await prisma.user.findMany({
      where: { role: "ADMINISTRATOR", isActive: true, NOT: { id: adminUser.id } },
      select: { id: true },
    });
    await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: false } });

    try {
      const demote = await admin.patch(`/api/admin/users/${adminUser.id}`).send({ role: "IT_STAFF" });
      expect(demote.status).toBe(400);
      expect(demote.body.error).toMatch(/at least one active administrator/i);
      const still = await prisma.user.findUnique({ where: { id: adminUser.id } });
      expect(still!.role).toBe("ADMINISTRATOR");

      // With a second active Administrator present, deactivating that second one is fine.
      const second = await createUser({ name: "Second Admin", role: "ADMINISTRATOR" });
      const deactivate = await admin.patch(`/api/admin/users/${second.res.body.id}`).send({ isActive: false });
      expect(deactivate.status).toBe(200);
      expect(deactivate.body.isActive).toBe(false);
    } finally {
      await prisma.user.updateMany({ where: { id: { in: others.map((o) => o.id) } }, data: { isActive: true } });
    }
  });

  it("uses deactivation, not deletion: there is no DELETE endpoint (BR-17)", async () => {
    const { res: created } = await createUser();
    const res = await admin.delete(`/api/admin/users/${created.body.id}`);
    expect(res.status).toBe(404);
    expect(await getPrisma().user.findUnique({ where: { id: created.body.id } })).not.toBeNull();
  });
});

describe("POST /api/admin/users/:id/reset-password (new initial password)", () => {
  it("API-17: sets mustChangePassword, changes the credential and ends the target's sessions", async () => {
    const { res: created, email } = await createUser({ name: "Reset Target" });
    const { agent: target } = await loginAs(email, INITIAL_PASSWORD);
    // Clear the initial change requirement so we can prove the reset sets it again.
    await getPrisma().user.update({ where: { id: created.body.id }, data: { mustChangePassword: false } });

    const newPassword = "Another#Pass2";
    const res = await admin.post(`/api/admin/users/${created.body.id}/reset-password`).send({ newInitialPassword: newPassword });
    expect(res.status).toBe(200);

    const after = await getPrisma().user.findUnique({ where: { id: created.body.id } });
    expect(after!.mustChangePassword).toBe(true);

    expect((await target.get("/api/auth/me")).status).toBe(401);
    expect((await loginAs(email, INITIAL_PASSWORD)).res.status).toBe(401);
    const fresh = await loginAs(email, newPassword);
    expect(fresh.res.status).toBe(200);
    expect(fresh.res.body.mustChangePassword).toBe(true);
  });

  it("rejects a weak password and returns 404 for an unknown user", async () => {
    const { res: created } = await createUser();
    const weak = await admin.post(`/api/admin/users/${created.body.id}/reset-password`).send({ newInitialPassword: "short" });
    expect(weak.status).toBe(400);
    expect(weak.body.fields.newInitialPassword).toBeDefined();

    const missing = await admin.post("/api/admin/users/999999/reset-password").send({ newInitialPassword: INITIAL_PASSWORD });
    expect(missing.status).toBe(404);
  });
});

describe("Authorization on every admin endpoint (AC-12)", () => {
  const endpoints: Array<[string, string]> = [
    ["get", "/api/admin/users"],
    ["post", "/api/admin/users"],
    ["patch", "/api/admin/users/1"],
    ["post", "/api/admin/users/1/reset-password"],
  ];

  it.each(endpoints)("%s %s returns 401 without a session", async (method, path) => {
    const res = await (request(app) as any)[method](path).send({});
    expect(res.status).toBe(401);
  });

  it.each(endpoints)("%s %s returns 403 for a Requester", async (method, path) => {
    const res = await requester[method](path).send({});
    expect(res.status).toBe(403);
  });

  it.each(endpoints)("%s %s returns 403 for IT Staff", async (method, path) => {
    const res = await staff[method](path).send({});
    expect(res.status).toBe(403);
  });
});
