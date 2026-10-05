import { useState, FormEvent } from "react";
import { changePassword, ApiError } from "../lab2/api";
import { useAuth } from "./AuthContext";

function checkRules(password: string) {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

export default function ChangePassword() {
  const { refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const rules = checkRules(newPassword);
  const allRulesPass = Object.values(rules).every(Boolean);
  const canSubmit = allRulesPass && newPassword === confirmPassword && currentPassword.length > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || status === "submitting") return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      await changePassword(currentPassword, newPassword, confirmPassword);
      await refresh(); // mustChangePassword now false; router will let the app through
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Unable to change password right now.");
      setStatus("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card p-4">
        <h1 className="h5 mb-1">Change Your Password</h1>
        <p className="text-muted small mb-4">You must change your password to continue.</p>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="current-password">Current (temporary) password</label>
            <input
              id="current-password"
              type="password"
              className="form-control"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              className="form-control"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="confirm-password">Confirm new password</label>
            <input
              id="confirm-password"
              type="password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
            {confirmPassword.length > 0 && confirmPassword !== newPassword && (
              <div className="tk-field-error">Passwords do not match</div>
            )}
          </div>

          <div className="mb-3 small">
            <p className="mb-1">Password must:</p>
            <ul className="list-unstyled">
              <li className={rules.length ? "text-success" : "text-muted"}>
                {rules.length ? "✓" : "○"} Be at least 8 characters
              </li>
              <li className={rules.upper && rules.lower ? "text-success" : "text-muted"}>
                {rules.upper && rules.lower ? "✓" : "○"} Include upper and lower case letters
              </li>
              <li className={rules.number && rules.special ? "text-success" : "text-muted"}>
                {rules.number && rules.special ? "✓" : "○"} Include a number and a special character
              </li>
            </ul>
          </div>

          {status === "error" && <div className="alert alert-danger py-2">{errorMessage}</div>}

          <button type="submit" className="btn btn-success w-100" disabled={!canSubmit || status === "submitting"}>
            {status === "submitting" ? "Saving…" : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
