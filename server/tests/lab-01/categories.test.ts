import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

// Requires the DB to be migrated (npx prisma migrate dev) and seeded
// (npm run prisma:seed) before running.
describe("GET /api/categories", () => {
  it("returns the four seeded categories in id order", async () => {
    const res = await request(app).get("/api/categories");
    expect(res.status).toBe(200);
    const names = res.body.map((c: { name: string }) => c.name);
    expect(names).toEqual(["Account and Access", "Hardware", "Software", "Network"]);
  });
});
