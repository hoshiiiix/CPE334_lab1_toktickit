import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  fetchStaffTicket, setTicketOwner, setItPriority, setTicketStatus,
  fetchComments, postComment, fetchNotes, postNote, fetchAssignees, CommentOrNote, Assignee,
} from "./staffApi";
import { Ticket } from "../lab2/api";

const TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED", "CANCELLED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: ["REOPENED"],
};

type LoadState = "loading" | "success" | "error" | "not-found";

export default function StaffTicketDetail() {
  const { id } = useParams();
  const ticketId = Number(id);
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<(Ticket & { requesterName: string }) | null>(null);
  const [comments, setComments] = useState<CommentOrNote[]>([]);
  const [notes, setNotes] = useState<CommentOrNote[]>([]);
  const [newComment, setNewComment] = useState("");
  const [newNote, setNewNote] = useState("");
  const [assignees, setAssignees] = useState<Assignee[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function load() {
    setState("loading");
    Promise.all([fetchStaffTicket(ticketId), fetchComments(ticketId), fetchNotes(ticketId), fetchAssignees()])
      .then(([t, c, n, a]) => { setTicket(t); setComments(c); setNotes(n); setAssignees(a); setState("success"); })
      .catch((err) => setState(err?.status === 404 ? "not-found" : "error"));
  }

  useEffect(() => { load(); }, [ticketId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state === "loading") return <p role="status">Loading ticket…</p>;
  if (state === "not-found") return <p>Ticket not found.</p>;
  if (state === "error") return <p className="text-danger">Unable to load this ticket right now.</p>;
  if (!ticket) return null;

  const allowedNext = TRANSITIONS[ticket.currentStatus] ?? [];

  // Active staff + the current owner (even if deactivated since) so the select always shows the real value.
  const ownerOptions: { id: number; label: string }[] = assignees.map((a) => ({
    id: a.id,
    label: `${a.name} (${a.role === "ADMINISTRATOR" ? "Administrator" : "IT Staff"})`,
  }));
  if (ticket.ticketOwnerId && !ownerOptions.some((o) => o.id === ticket.ticketOwnerId)) {
    ownerOptions.push({ id: ticket.ticketOwnerId, label: `${ticket.ticketOwnerName ?? "Current owner"} (inactive)` });
  }

  async function runUpdate(action: () => Promise<Partial<Ticket>>) {
    setActionError(null);
    setSaving(true);
    try {
      const updated = await action();
      setTicket((prev) => (prev ? { ...prev, ...updated } : prev));
    } catch (err: any) {
      setActionError(err?.message || "Unable to save this change right now.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <Link to="/queue" className="d-inline-block mb-3">← Back to Queue</Link>
      <h1 className="h4 mb-4">Ticket {ticket.ticketNumber}</h1>

      <div className="row mb-2">
        <div className="col-md-6">
          <label className="form-label small">Requester</label>
          <input className="form-control tk-readonly" readOnly value={ticket.requesterName} />
        </div>
        <div className="col-md-6">
          <label className="form-label small">Requested Priority</label>
          <input className="form-control tk-readonly" readOnly value={ticket.requestedPriority} />
        </div>
      </div>

      <div className="row mb-2">
        <div className="col-md-4">
          <label className="form-label small" htmlFor="ticket-owner">Ticket Owner</label>
          <select
            id="ticket-owner"
            className="form-select"
            disabled={saving}
            value={ticket.ticketOwnerId ?? ""}
            onChange={(e) => {
              const val = e.target.value ? Number(e.target.value) : null;
              runUpdate(() => setTicketOwner(ticket.id, val));
            }}
          >
            <option value="">Unassigned</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small" htmlFor="it-priority">IT Priority</label>
          <select
            id="it-priority"
            className="form-select"
            disabled={saving}
            value={ticket.itPriority ?? ""}
            onChange={(e) => runUpdate(() => setItPriority(ticket.id, e.target.value))}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label small" htmlFor="ticket-status">Current Status</label>
          <select
            id="ticket-status"
            className="form-select"
            disabled={saving}
            value=""
            onChange={(e) => {
              if (!e.target.value) return;
              const next = e.target.value;
              runUpdate(() => setTicketStatus(ticket.id, next));
            }}
          >
            <option value="">{ticket.currentStatus.replace(/_/g, " ")} (current)</option>
            {allowedNext.map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
      </div>

      {actionError && (
        <div className="alert alert-danger py-2" role="alert">{actionError}</div>
      )}

      <div className="mb-2">
        <label className="form-label small">Summary</label>
        <input className="form-control tk-readonly" readOnly value={ticket.summary} />
      </div>
      <div className="mb-3">
        <label className="form-label small">Description</label>
        <textarea className="form-control tk-readonly" readOnly value={ticket.description} rows={3} />
      </div>

      {ticket.requesterMarkedResolved && (
        <div className="alert alert-success py-2">Requester has indicated this appears resolved.</div>
      )}

      <div className="card p-3 mb-3" style={{ borderColor: "var(--color-secondary)" }}>
        <h2 className="h6">Public Comments</h2>
        <ul className="list-unstyled">
          {comments.map((c) => (
            <li key={c.id} className="mb-2 small">
              <strong>{c.authorName}</strong> <span className="badge bg-secondary">{c.authorRole}</span>
              <div>{c.content}</div>
            </li>
          ))}
        </ul>
        <div className="input-group">
          <input className="form-control" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a public comment…" />
          <button
            className="btn btn-success"
            onClick={async () => {
              if (!newComment.trim()) return;
              const c = await postComment(ticket.id, newComment.trim());
              setComments([...comments, c]);
              setNewComment("");
            }}
          >
            Post
          </button>
        </div>
      </div>

      <div className="card p-3" style={{ borderColor: "#B8860B" }}>
        <h2 className="h6">🔒 Internal Notes <span className="small text-muted">— Only visible to IT Staff and Administrators</span></h2>
        <ul className="list-unstyled">
          {notes.map((n) => (
            <li key={n.id} className="mb-2 small">
              <strong>{n.authorName}</strong>
              <div>{n.content}</div>
            </li>
          ))}
        </ul>
        <div className="input-group">
          <input className="form-control" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder="Add an internal note…" />
          <button
            className="btn btn-outline-secondary"
            onClick={async () => {
              if (!newNote.trim()) return;
              const n = await postNote(ticket.id, newNote.trim());
              setNotes([...notes, n]);
              setNewNote("");
            }}
          >
            Post
          </button>
        </div>
      </div>
    </div>
  );
}
