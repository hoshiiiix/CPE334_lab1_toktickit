import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  ApiError,
} from "./api";
import { useDevRequester } from "./DevRequesterContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;

export default function CreateTicket() {
  const { requesterId, requesterName } = useDevRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [relatedSystemId, setRelatedSystemId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdTicketNumber, setCreatedTicketNumber] = useState("");

  useEffect(() => {
    fetchCategories().then(setCategories).catch(() => {});
    fetchRelatedSystems().then(setRelatedSystems).catch(() => {});
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    const errors: string[] = [];
    const valid: File[] = [];

    if (selected.length > MAX_FILES) {
      errors.push(`You may attach at most ${MAX_FILES} files.`);
    }

    for (const f of selected.slice(0, MAX_FILES)) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        errors.push(`${f.name}: file type not allowed`);
        continue;
      }
      if (f.size > MAX_SIZE) {
        errors.push(`${f.name}: exceeds 5MB`);
        continue;
      }
      valid.push(f);
    }
    setFiles(valid);
    setFileErrors(errors);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting" || !requesterId) return;

    // Explicit client-side validation (BR-07): don't rely on HTML5 `required`
    // alone, since it isn't reliably enforced across all environments (e.g. jsdom
    // tests) and per-field messages are required regardless (AC-04, AC-05).
    const errors: Record<string, string> = {};
    const trimmedSummary = summary.trim();
    const trimmedDescription = description.trim();
    if (trimmedSummary.length < 5 || trimmedSummary.length > 120) {
      errors.summary = "Summary must be 5-120 characters";
    }
    if (trimmedDescription.length < 10 || trimmedDescription.length > 2000) {
      errors.description = "Description must be 10-2000 characters";
    }
    if (!categoryId) errors.categoryId = "Category is required";
    if (!relatedSystemId) errors.relatedSystemId = "Related System is required";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setStatus("submitting");
    setFieldErrors({});
    setErrorMessage("");

    const formData = new FormData();
    formData.append("categoryId", categoryId);
    formData.append("relatedSystemId", relatedSystemId);
    formData.append("summary", trimmedSummary);
    formData.append("description", trimmedDescription);
    formData.append("requestedPriority", requestedPriority);
    files.forEach((f) => formData.append("attachments", f));

    try {
      const ticket = await createTicket(requesterId, formData);
      setCreatedTicketNumber(ticket.ticketNumber);
      setStatus("success");
    } catch (err) {
      if (err instanceof ApiError && err.fields) {
        setFieldErrors(err.fields);
        setStatus("idle");
      } else {
        setErrorMessage("Unable to create ticket right now. Your entries have been kept.");
        setStatus("error");
      }
    }
  }

  if (status === "success") {
    return (
      <div className="tk-success-panel" style={{ maxWidth: 480 }}>
        <h2 className="h5">Ticket created</h2>
        <p>
          Your official Ticket Number is <strong>{createdTicketNumber}</strong>.
        </p>
        <button className="btn btn-success me-2" onClick={() => navigate("/tickets")}>
          View My Tickets
        </button>
        <button
          className="btn btn-outline-success"
          onClick={() => {
            setStatus("idle");
            setSummary("");
            setDescription("");
            setFiles([]);
          }}
        >
          Create Another
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 640 }}>
      <h1 className="h4 mb-4">Create Ticket</h1>

      <div className="mb-3">
        <label className="form-label">Requester</label>
        <input className="form-control tk-readonly" value={requesterName ?? ""} readOnly />
      </div>

      <div className="row">
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="ticket-category">
            Category <span className="text-danger">*</span>
          </label>
          <select
            id="ticket-category"
            className="form-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {fieldErrors.categoryId && <div className="tk-field-error">{fieldErrors.categoryId}</div>}
        </div>
        <div className="col-md-6 mb-3">
          <label className="form-label" htmlFor="ticket-related-system">
            Related System <span className="text-danger">*</span>
          </label>
          <select
            id="ticket-related-system"
            className="form-select"
            value={relatedSystemId}
            onChange={(e) => setRelatedSystemId(e.target.value)}
            required
          >
            <option value="">Select…</option>
            {relatedSystems.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {fieldErrors.relatedSystemId && (
            <div className="tk-field-error">{fieldErrors.relatedSystemId}</div>
          )}
        </div>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="ticket-priority">
          Requested Priority <span className="text-danger">*</span>
        </label>
        <select
          id="ticket-priority"
          className="form-select"
          value={requestedPriority}
          onChange={(e) => setRequestedPriority(e.target.value)}
        >
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
        </select>
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="ticket-summary">
          Ticket Summary <span className="text-danger">*</span>
        </label>
        <input
          id="ticket-summary"
          className="form-control"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          maxLength={120}
          required
        />
        {fieldErrors.summary && <div className="tk-field-error">{fieldErrors.summary}</div>}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="ticket-description">
          Description <span className="text-danger">*</span>
        </label>
        <textarea
          id="ticket-description"
          className="form-control"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={2000}
          required
        />
        {fieldErrors.description && (
          <div className="tk-field-error">{fieldErrors.description}</div>
        )}
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="ticket-attachments">Attachments (JPG, PNG, WEBP, PDF — max 5MB each, up to 5 files)</label>
        <input id="ticket-attachments" type="file" className="form-control" multiple onChange={handleFileChange} />
        {fileErrors.map((err, i) => (
          <div key={i} className="tk-field-error">
            {err}
          </div>
        ))}
        {files.length > 0 && (
          <ul className="small mt-2">
            {files.map((f) => (
              <li key={f.name}>
                {f.name} ({Math.round(f.size / 1024)} KB)
              </li>
            ))}
          </ul>
        )}
      </div>

      {status === "error" && <div className="alert alert-danger">{errorMessage}</div>}

      <button type="submit" className="btn btn-success" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting…" : "Submit Ticket"}
      </button>
    </form>
  );
}
