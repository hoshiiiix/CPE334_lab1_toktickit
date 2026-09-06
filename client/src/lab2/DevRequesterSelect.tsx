import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDevRequesters, DevRequesterOption, ApiError } from "./api";
import { useDevRequester } from "./DevRequesterContext";

type LoadState = "loading" | "success" | "empty" | "error";

export default function DevRequesterSelect() {
  const [state, setState] = useState<LoadState>("loading");
  const [requesters, setRequesters] = useState<DevRequesterOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const { selectRequester } = useDevRequester();
  const navigate = useNavigate();

  useEffect(() => {
    fetchDevRequesters()
      .then((data) => {
        setRequesters(data);
        setState(data.length === 0 ? "empty" : "success");
      })
      .catch(() => setState("error"));
  }, []);

  function handleContinue() {
    const requester = requesters.find((r) => String(r.id) === selectedId);
    if (!requester) return;
    selectRequester(requester.id, requester.name);
    navigate("/tickets");
  }

  return (
    <div className="container py-5" style={{ maxWidth: 480 }}>
      <div className="card p-4 text-center">
        <h1 className="h4 mb-2">TokTickIT</h1>
        <h2 className="h5 mb-3">Select Development Requester</h2>
        <p className="text-muted small">
          Choose a development requester to simulate the current requester context
          for Lab 2. This is for testing only and is not a login screen.
        </p>

        {state === "loading" && <p role="status">Loading requesters…</p>}

        {state === "empty" && (
          <p className="text-warning">No active Development Requesters are available.</p>
        )}

        {state === "error" && (
          <p className="text-danger">Unable to load Development Requesters right now.</p>
        )}

        {state === "success" && (
          <>
            <div className="mb-3 text-start">
              <label htmlFor="dev-requester-select" className="form-label">
                Development Requester <span className="text-danger">*</span>
              </label>
              <select
                id="dev-requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                <option value="" disabled>
                  Choose a requester…
                </option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="alert alert-success py-2 small">
              Only active development requesters are shown.
            </div>
            <div className="alert alert-light border py-2 small text-start">
              <strong>Authentication coming in Lab 3.</strong> This selection will be
              replaced with secure authentication.
            </div>
            <button
              className="btn btn-success w-100"
              disabled={!selectedId}
              onClick={handleContinue}
            >
              Continue →
            </button>
          </>
        )}
      </div>
    </div>
  );
}
