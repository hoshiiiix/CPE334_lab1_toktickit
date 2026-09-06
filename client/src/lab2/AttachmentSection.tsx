import { useState } from "react";
import { Attachment, addAttachment, downloadAttachmentUrl, removeAttachment } from "./api";
import { useDevRequester } from "./DevRequesterContext";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;

interface Props {
  ticketId: number;
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
}

export default function AttachmentSection({ ticketId, attachments, onChange }: Props) {
  const { requesterId } = useDevRequester();
  const [uploadError, setUploadError] = useState("");
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [reason, setReason] = useState("");
  const activeCount = attachments.filter((a) => !a.isRemoved).length;

  async function handleAdd(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !requesterId) return;
    setUploadError("");

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(`${file.name}: file type not allowed`);
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadError(`${file.name}: exceeds 5MB`);
      return;
    }
    if (activeCount >= 5) {
      setUploadError("This ticket already has the maximum of 5 active attachments.");
      return;
    }

    try {
      const attachment = await addAttachment(requesterId, ticketId, file);
      onChange([...attachments, attachment]);
    } catch (err) {
      setUploadError("Unable to add attachment right now.");
    }
  }

  async function handleConfirmRemove(id: number) {
    if (!requesterId || reason.trim().length < 3) return;
    try {
      const updated = await removeAttachment(requesterId, id, reason.trim());
      onChange(
        attachments.map((a) =>
          a.id === id ? { ...a, isRemoved: true, removedReason: updated.removedReason } : a
        )
      );
      setRemovingId(null);
      setReason("");
    } catch {
      setUploadError("Unable to remove attachment right now.");
    }
  }

  return (
    <div className="card p-3 mt-3">
      <h2 className="h6">Attachments</h2>

      <ul className="list-group mb-3">
        {attachments.map((a) => (
          <li key={a.id} className="list-group-item d-flex justify-content-between align-items-center">
            <span className={a.isRemoved ? "text-muted text-decoration-line-through" : ""}>
              {a.originalFilename}
              {a.isRemoved && <span className="badge tk-badge-removed ms-2">Removed</span>}
            </span>
            {!a.isRemoved && (
              <div className="d-flex gap-2">
                <a
                  className="btn btn-sm btn-outline-secondary"
                  href={downloadAttachmentUrl(a.id)}
                  aria-label={`Download ${a.originalFilename}`}
                >
                  Download
                </a>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => setRemovingId(a.id)}
                  aria-label={`Remove ${a.originalFilename}`}
                >
                  Remove
                </button>
              </div>
            )}
          </li>
        ))}
        {attachments.length === 0 && <li className="list-group-item text-muted">No attachments yet.</li>}
      </ul>

      {removingId !== null && (
        <div className="mb-3 border rounded p-2">
          <label className="form-label small">Reason for removal (required)</label>
          <input
            className="form-control mb-2"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <button
            className="btn btn-sm btn-danger me-2"
            disabled={reason.trim().length < 3}
            onClick={() => handleConfirmRemove(removingId)}
          >
            Confirm Removal
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => {
              setRemovingId(null);
              setReason("");
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {activeCount < 5 ? (
        <input type="file" className="form-control" onChange={handleAdd} />
      ) : (
        <p className="small text-muted">Maximum of 5 active attachments reached.</p>
      )}
      {uploadError && <div className="tk-field-error">{uploadError}</div>}
    </div>
  );
}
