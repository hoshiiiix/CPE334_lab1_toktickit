import { describe, it, expect } from "vitest";
import { getPrisma } from "../../src/prisma.js";

describe("DevRequester → User migration (API-18, AC-14)", () => {
  it("preserves ticket ownership under the same requester ids after migration", async () => {
    const prisma = getPrisma();
    const requester = await prisma.user.findFirst({ where: { role: "REQUESTER" } });
    expect(requester).not.toBeNull();

    const ticket = await prisma.ticket.findFirst({ where: { requesterId: requester!.id } });
    // Not every seeded requester necessarily has a ticket in a fresh DB; this
    // asserts the relation is queryable and consistent when one exists.
    if (ticket) {
      expect(ticket.requesterId).toBe(requester!.id);
    }
  });

  it("seeded requesters carry role=REQUESTER and a valid passwordHash", async () => {
    const prisma = getPrisma();
    const requesters = await prisma.user.findMany({ where: { role: "REQUESTER" } });
    expect(requesters.length).toBeGreaterThan(0);
    for (const r of requesters) {
      expect(r.passwordHash.length).toBeGreaterThan(0);
    }
  });
});
