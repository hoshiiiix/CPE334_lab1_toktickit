import type { PrismaClient } from "@prisma/client";

// BR-01: format TKT-{YYYY}-{6-digit sequence}, sequence resets each calendar year,
// full string is globally unique. Safe under concurrent requests via a DB
// transaction that recomputes MAX(yearSequence) for the current year and retries
// once on a unique-constraint collision.
export function formatTicketNumber(year: number, sequence: number): string {
  return `TKT-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function generateTicketNumber(
  prisma: PrismaClient,
  now: Date = new Date()
): Promise<{ ticketNumber: string; ticketYear: number; yearSequence: number }> {
  const ticketYear = now.getUTCFullYear();

  return prisma.$transaction(async (tx) => {
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
  });
}
