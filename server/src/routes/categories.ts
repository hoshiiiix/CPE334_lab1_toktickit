import { Router, Request, Response } from "express";
import { getPrisma } from "../prisma.js";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await getPrisma().category.findMany({
      where: { isActive: true },
      orderBy: { id: "asc" },
      select: { id: true, name: true },
    });
    res.status(200).json(categories);
  } catch (err) {
    console.error("Failed to load categories:", err);
    res.status(500).json({ error: "Unable to load categories right now." });
  }
});
