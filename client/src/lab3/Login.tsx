import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import { ApiError } from "../lab2/api";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setErrorMessage("");
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setErrorMessage("Too many attempts. Try again later.");
      } else {
        // BR-01/AC-02: identical generic message regardless of the real cause
        setErrorMessage("Invalid email or password. Please try again.");
      }
      setStatus("error");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 420 }}>
      <div className="card p-4">
        <h1 className="h4 text-center mb-1">TokTickIT</h1>
        <h2 className="h6 text-center text-muted mb-4">Sign in to your account</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="mb-3">
            <label className="form-label" htmlFor="login-password">Password</label>
            <div className="input-group">
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {status === "error" && (
            <div className="alert alert-danger py-2" role="alert">
              {errorMessage}
            </div>
          )}

          <button type="submit" className="btn btn-success w-100" disabled={status === "submitting"}>
            {status === "submitting" ? "Signing in…" : "Sign In"}
          </button>

          <div className="text-center mt-3">
            <span
              className="text-muted small"
              title="Coming in a future release"
              style={{ cursor: "not-allowed" }}
            >
              Forgot your password?
            </span>
          </div>
        </form>
      </div>
    </div>
  );
}
