import type { PrismaClient } from "@prisma/client";

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
      const isCollision = err?.code === "P2002" || err?.code === "P2034";
      if (!isCollision) throw err;
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
    }
  }
  throw lastError;
}
