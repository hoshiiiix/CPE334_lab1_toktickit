import express, { Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { getPrisma } from "./prisma.js";
import { categoriesRouter } from "./routes/categories.js";
import { relatedSystemsRouter } from "./routes/relatedSystems.js";
import { authRouter } from "./routes/auth.js";
import { ticketsRouter } from "./routes/tickets.js";
import { attachmentsRouter } from "./routes/attachments.js";
import { staffTicketsRouter } from "./routes/staffTickets.js";
import { commentsNotesRouter } from "./routes/commentsNotes.js";

export const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());

app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", service: "TokTickIT API" });
});

app.use("/api/categories", categoriesRouter);
app.use("/api/related-systems", relatedSystemsRouter);
app.use("/api/auth", authRouter);
app.use("/api/tickets", ticketsRouter);
app.use("/api", attachmentsRouter);
app.use("/api/staff/tickets", staffTicketsRouter);
app.use("/api", commentsNotesRouter);

export default app;
