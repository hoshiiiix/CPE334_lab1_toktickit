import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const relatedSystemsRouter = Router();

relatedSystemsRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const systems = await getPrisma().relatedSystem.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(systems);
  } catch (err) {
    console.error("Failed to load related systems:", err);
    res.status(500).json({ error: "Unable to load Related Systems right now." });
  }
});
