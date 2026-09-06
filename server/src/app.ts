import express, { Request, Response } from "express";
import cors from "cors";
import { getPrisma } from "./prisma.js";
import { categoriesRouter } from "./routes/categories.js";
import { relatedSystemsRouter } from "./routes/relatedSystems.js";
import { devRequestersRouter } from "./routes/devRequesters.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";

export const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 1 — reference data (categories now filters isActive, extended in Lab 2)
// ---------------------------------------------------------------------------
app.use("/api/categories", categoriesRouter);

// ---------------------------------------------------------------------------
// Lab 2 — reference data, dev requester context, tickets, attachments
// ---------------------------------------------------------------------------
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/dev-requesters", devRequestersRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api", attachmentsRouter); // exposes /api/tickets/:id/attachments and /api/attachments/:id/*

export default app;
