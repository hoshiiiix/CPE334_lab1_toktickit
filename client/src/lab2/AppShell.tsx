import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useAuth } from "../lab3/AuthContext";

const ROLE_BADGE: Record<string, string> = {
  REQUESTER: "badge bg-secondary",
  IT_STAFF: "badge tk-badge-new",
  ADMINISTRATOR: "badge bg-light text-dark border",
};

export default function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const canSeeQueue = user?.role === "IT_STAFF" || user?.role === "ADMINISTRATOR";
  const isAdmin = user?.role === "ADMINISTRATOR";

  return (
    <div>
      <nav className="navbar navbar-expand tk-navbar px-3">
        <span className="navbar-brand text-white fw-bold">TokTickIT</span>
        <div className="d-flex gap-3">
          {user?.role === "REQUESTER" && (
            <>
              <NavLink className="nav-link" to="/tickets">My Tickets</NavLink>
              <NavLink className="nav-link" to="/tickets/new">Create Ticket</NavLink>
            </>
          )}
          {canSeeQueue && <NavLink className="nav-link" to="/queue">My Queue</NavLink>}
          {isAdmin && <NavLink className="nav-link" to="/admin/users">Admin</NavLink>}
        </div>
        <div className="ms-auto d-flex align-items-center gap-2 text-white small">
          <span>{user?.name}</span>
          {user && <span className={ROLE_BADGE[user.role]}>{user.role.replace("_", " ")}</span>}
          <button className="btn btn-sm btn-outline-light" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </nav>
      <main className="container py-4">{children}</main>
    </div>
  );
}
