import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getPrisma } from "./prisma.js";
import { categoriesRouter } from "./routes/categories.js";
import { relatedSystemsRouter } from "./routes/relatedSystems.js";
import { authRouter } from "./routes/auth.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";

export const app = express();
app.use(cors({ origin: true, credentials: true })); // credentials required for session cookie
app.use(cookieParser());
app.use(express.json());

// ---------------------------------------------------------------------------
// Lab 1 — health check
// ---------------------------------------------------------------------------
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

// ---------------------------------------------------------------------------
// Lab 1/2 — reference data
// ---------------------------------------------------------------------------
app.use("/api/categories", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);

// ---------------------------------------------------------------------------
// Lab 3 — authentication
// ---------------------------------------------------------------------------
app.use("/api/auth", authRouter);

// ---------------------------------------------------------------------------
// Lab 2 (now session-authenticated) — Requester tickets/attachments
// ---------------------------------------------------------------------------
app.use("/api/tickets", ticketsRouter);
app.use("/api", attachmentsRouter);

export default app;
