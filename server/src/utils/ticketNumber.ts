import type { PrismaClient } from "@prisma/client";

// BR-01: format TKT-{YYYY}-{6-digit sequence}, sequence resets each calendar year,
// full string is globally unique. Two concurrent requests can both read the same
// MAX(yearSequence) under READ COMMITTED before either commits, so the caller
// (routes/tickets.ts) must retry the whole create-with-ticket-number operation on
// a P2002 unique-constraint error. This helper alone computes the next candidate;
// see generateTicketNumberWithRetry for the safe end-to-end version.
export function formatTicketNumber(year: number, sequence: number): string {
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function generateTicketNumber(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<{ ticketNumber: string; ticketYear: number; yearSequence: number }> {
  const ticketYear = now.getUTCFullYear();

  return prisma.$transaction(
    async (tx) => {
      const last = await tx.ticket.findFirst({
        where: { ticketYear },
        orderBy: { yearSequence: "desc" },
        select: { yearSequence: true },
      });
      const yearSequence = (last?.yearSequence ?? 0) + 1;
      return {
        ticketNumber: formatTicketNumber(ticketYear, yearSequence),
        ticketYear,
        yearSequence,
      };
    },
    { isolationLevel: "Serializable" }
  );
}

// Wraps a create operation that needs a fresh ticket number, retrying a few times
// if a concurrent request grabbed the same sequence first (Postgres error code
// P2002 on the ticketNumber/ (ticketYear, yearSequence) unique constraints, or a
// serialization failure from the transaction above).
export async function withTicketNumberRetry<T>(
  prisma: PrismaClient,
  attempt: (numbers: { ticketNumber: string; ticketYear: number; yearSequence: number }) => Promise<T>,
  maxAttempts = 5
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const numbers = await generateTicketNumber(prisma);
      return await attempt(numbers);
    } catch (err: any) {
      lastError = err;
      const isCollision =
        err?.code === "P2002" || err?.code === "P2034" /* transaction conflict */;
      if (!isCollision) throw err;
      // brief backoff before retrying with a freshly computed sequence
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
    }
  }
  throw lastError;
}
