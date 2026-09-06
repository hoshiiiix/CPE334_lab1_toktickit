import { NavLink, useNavigate } from "react-router-dom";
import { ReactNode } from "react";
import { useDevRequester } from "./DevRequesterContext";

export default function AppShell({ children }: { children: ReactNode }) {
  const { requesterName, clearRequester } = useDevRequester();
  const navigate = useNavigate();

  function handleChangeRequester() {
    clearRequester();
    navigate("/select-requester");
  }

  return (
    <div>
      <nav className="navbar navbar-expand tk-navbar px-3">
        <span className="navbar-brand text-white fw-bold">TokTickIT</span>
        <div className="d-flex gap-3">
          <NavLink className="nav-link" to="/tickets">
            My Tickets
          </NavLink>
          <NavLink className="nav-link" to="/tickets/new">
            Create Ticket
          </NavLink>
        </div>
        <div className="ms-auto d-flex align-items-center gap-2 text-white small">
          <span>{requesterName}</span>
          <button className="btn btn-sm btn-outline-light" onClick={handleChangeRequester}>
            Change Requester
          </button>
        </div>
      </nav>
      <main className="container py-4">{children}</main>
    </div>
  );
}
