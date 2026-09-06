import { describe, it, expect } from "vitest";
import { formatTicketNumber } from "./ticketNumber.js";

describe("formatTicketNumber (UNIT-01)", () => {
  it("pads the sequence to 6 digits and includes the year", () => {
    expect(formatTicketNumber(2026, 42)).toBe("TKT-2026-000042");
    expect(formatTicketNumber(2026, 1)).toBe("TKT-2026-000001");
  });
});

describe("per-year sequence reset (UNIT-02)", () => {
  it("documents that sequence 1 is valid again in a new year", () => {
    // generateTicketNumber (integration-tested in create-ticket.api.test.ts)
    // computes MAX(yearSequence) scoped to ticketYear, so a new year always
    // starts back at 1 regardless of the previous year's final sequence.
    expect(formatTicketNumber(2027, 1)).toBe("TKT-2027-000001");
  });
});
