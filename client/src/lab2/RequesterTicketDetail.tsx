import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTicket, Ticket } from "./api";
import { useDevRequester } from "./DevRequesterContext";
import AttachmentSection from "./AttachmentSection";

type LoadState = "loading" | "success" | "error" | "not-found";

export default function RequesterTicketDetail() {
  const { id } = useParams();
  const { requesterId } = useDevRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!requesterId || !id) return;
    setState("loading");
    fetchTicket(requesterId, Number(id))
      .then((t) => {
        setTicket(t);
        setState("success");
      })
      .catch((err) => setState(err?.status === 404 ? "not-found" : "error"));
  }, [requesterId, id]);

  if (state === "loading") return <p role="status">Loading ticket…</p>;
  if (state === "not-found") return <p>Ticket not found.</p>;
  if (state === "error") return <p className="text-danger">Unable to load this ticket right now.</p>;
  if (!ticket) return null;

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/tickets" className="d-inline-block mb-3">
        ← Back to My Tickets
      </Link>
      <h1 className="h4 mb-4">Ticket {ticket.ticketNumber}</h1>

      <div className="row mb-2">
        <div className="col-md-6">
          <label className="form-label small">Created</label>
          <input className="form-control tk-readonly" readOnly value={new Date(ticket.createdAt).toLocaleString()} />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Requested Priority</label>
          <input className="form-control tk-readonly" readOnly value={ticket.requestedPriority} />
        </div>
      </div>

      <div className="mb-2">
        <label className="form-label small">Summary</label>
        <input className="form-control tk-readonly" readOnly value={ticket.summary} />
      </div>

      <div className="mb-2">
        <label className="form-label small">Description</label>
        <textarea className="form-control tk-readonly" readOnly value={ticket.description} rows={4} />
      </div>

      <div className="mb-2">
        <label className="form-label small">Current Status</label>
        <input className="form-control tk-readonly" readOnly value={ticket.currentStatus} />
      </div>

      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        onChange={(attachments) => setTicket({ ...ticket, attachments })}
      />
    </div>
  );
}
