import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const devRequestersRouter = Router();

devRequestersRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const requesters = await getPrisma().devRequester.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });
    res.status(200).json(requesters);
  } catch (err) {
    console.error("Failed to load dev requesters:", err);
    res.status(500).json({ error: "Unable to load Development Requesters right now." });
  }
});
