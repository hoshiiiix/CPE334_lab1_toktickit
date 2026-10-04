import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchTicket, markTicketResolved, Ticket, ApiError } from "./api";
import { fetchComments, postComment, CommentOrNote } from "../lab3/staffApi";
import AttachmentSection from "./AttachmentSection";

type LoadState = "loading" | "success" | "error" | "not-found";

const MAX_COMMENT_LENGTH = 2000;

export default function RequesterTicketDetail() {
  const { id } = useParams();
  const [state, setState] = useState<LoadState>("loading");
  const [ticket, setTicket] = useState<Ticket | null>(null);

  const [comments, setComments] = useState<CommentOrNote[]>([]);
  const [commentsError, setCommentsError] = useState("");
  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [posting, setPosting] = useState(false);

  const [resolving, setResolving] = useState(false);
  const [resolveError, setResolveError] = useState("");

  useEffect(() => {
    if (!id) return;
    setState("loading");
    fetchTicket(Number(id))
      .then((t) => { setTicket(t); setState("success"); })
      .catch((err) => setState(err instanceof ApiError && err.status === 404 ? "not-found" : "error"));

    // Comments load independently so a comments failure never hides the ticket itself.
    setCommentsError("");
    fetchComments(Number(id))
      .then(setComments)
      .catch(() => setCommentsError("Unable to load comments right now."));
  }, [id]);

  if (state === "loading") return <p role="status">Loading ticket…</p>;
  if (state === "not-found") return <p>Ticket not found.</p>;
  if (state === "error") return <p className="text-danger">Unable to load this ticket right now.</p>;
  if (!ticket) return null;

  const canMarkResolved =
    !ticket.requesterMarkedResolved &&
    ticket.currentStatus !== "CLOSED" &&
    ticket.currentStatus !== "CANCELLED";

  async function handlePostComment() {
    const content = newComment.trim();
    if (!content) { setCommentError("Comment cannot be empty."); return; }
    if (content.length > MAX_COMMENT_LENGTH) {
      setCommentError(`Comment must be at most ${MAX_COMMENT_LENGTH} characters.`);
      return;
    }
    setCommentError("");
    setPosting(true);
    try {
      const c = await postComment(ticket!.id, content);
      setComments((prev) => [...prev, c]);
      setNewComment("");
    } catch (err: any) {
      setCommentError(err?.message || "Unable to post your comment right now.");
    } finally {
      setPosting(false);
    }
  }

  async function handleMarkResolved() {
    setResolveError("");
    setResolving(true);
    try {
      const result = await markTicketResolved(ticket!.id);
      setTicket((prev) => (prev ? { ...prev, requesterMarkedResolved: result.requesterMarkedResolved } : prev));
    } catch (err: any) {
      setResolveError(err?.message || "Unable to send this right now. Please try again.");
    } finally {
      setResolving(false);
    }
  }

  return (
    <div style={{ maxWidth: 720 }}>
      <Link to="/tickets" className="d-inline-block mb-3">← Back to My Tickets</Link>
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

      <div className="mb-3">
        <label className="form-label small">Current Status</label>
        <input className="form-control tk-readonly" readOnly value={ticket.currentStatus.replace(/_/g, " ")} />
      </div>

      {ticket.requesterMarkedResolved ? (
        <div className="alert alert-success py-2" role="status">
          You told IT Staff this problem appears resolved. They will confirm and close the ticket.
        </div>
      ) : (
        canMarkResolved && (
          <div className="mb-3">
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={handleMarkResolved}
              disabled={resolving}
            >
              {resolving ? "Sending…" : "Problem Appears Resolved"}
            </button>
            <div className="form-text">
              This only lets IT Staff know. Only IT Staff can formally resolve or close the ticket.
            </div>
          </div>
        )
      )}
      {resolveError && <div className="alert alert-danger py-2" role="alert">{resolveError}</div>}

      <AttachmentSection
        ticketId={ticket.id}
        attachments={ticket.attachments}
        onChange={(attachments) => setTicket({ ...ticket, attachments })}
      />

      <div className="card p-3 mt-4" style={{ borderColor: "var(--color-secondary)" }}>
        <h2 className="h6">Public Comments</h2>
        {commentsError && <p className="text-danger small" role="alert">{commentsError}</p>}
        {!commentsError && comments.length === 0 && (
          <p className="small text-muted">No comments yet.</p>
        )}
        <ul className="list-unstyled">
          {comments.map((c) => (
            <li key={c.id} className="mb-2 small">
              <strong>{c.authorName}</strong>{" "}
              {c.authorRole && <span className="badge bg-secondary">{c.authorRole.replace("_", " ")}</span>}{" "}
              <span className="text-muted">{new Date(c.createdAt).toLocaleString()}</span>
              <div>{c.content}</div>
            </li>
          ))}
        </ul>

        <label className="form-label small" htmlFor="new-comment">Add a comment</label>
        <div className="input-group">
          <input
            id="new-comment"
            className={`form-control ${commentError ? "is-invalid" : ""}`}
            value={newComment}
            maxLength={MAX_COMMENT_LENGTH}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Type your comment here…"
            disabled={posting}
          />
          <button className="btn btn-success" onClick={handlePostComment} disabled={posting}>
            {posting ? "Posting…" : "Post Comment"}
          </button>
        </div>
        {commentError && <div className="tk-field-error small mt-1" role="alert">{commentError}</div>}
        <div className="form-text">Visible to you and IT Staff.</div>
      </div>
    </div>
  );
}
