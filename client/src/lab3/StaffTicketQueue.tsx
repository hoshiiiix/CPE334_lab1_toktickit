import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchStaffTickets, StaffTicketListParams } from "./staffApi";
import { Ticket, Pagination } from "../lab2/api";

type LoadState = "loading" | "success" | "empty" | "no-results" | "error" | "forbidden";

function PriorityBadge({ value }: { value: string | null }) {
  if (!value) return <span className="badge bg-light text-muted">—</span>;
  const cls = value === "HIGH" ? "tk-badge-high" : value === "MEDIUM" ? "tk-badge-medium" : "tk-badge-low";
  return <span className={`badge ${cls}`}>{value}</span>;
}
function StatusBadge({ value }: { value: string }) {
  return <span className="badge tk-badge-new">{value.replace(/_/g, " ")}</span>;
}

export default function StaffTicketQueue() {
  const [state, setState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [everHadTickets, setEverHadTickets] = useState(false);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    setState("loading");
    const params: StaffTicketListParams = { search: search || undefined, status: status || undefined, page };
    fetchStaffTickets(params)
      .then((res) => {
        setTickets(res.data);
        setPagination(res.pagination);
        const hasFilters = Boolean(search || status);
        if (res.data.length > 0) { setEverHadTickets(true); setState("success"); }
        else if (!hasFilters && !everHadTickets) setState("empty");
        else setState("no-results");
      })
      .catch((err) => setState(err?.status === 403 ? "forbidden" : "error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  return (
    <div>
      <h1 className="h4 mb-3">My Queue</h1>

      <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-md-4">
          <input className="form-control" placeholder="Search by ticket number or summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-md-3">
          <select className="form-select" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); setTimeout(load, 0); }}>
            <option value="">All Statuses</option>
            {["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3">
          <button type="submit" className="btn btn-outline-success w-100">Search</button>
        </div>
      </form>

      {state === "loading" && <p role="status">Loading queue…</p>}
      {state === "forbidden" && <p>You don't have permission to view this.</p>}
      {state === "error" && <p className="text-danger">Unable to load the ticket queue right now.</p>}
      {state === "empty" && <p>No tickets in the queue yet.</p>}
      {state === "no-results" && <p>No tickets match your current search/filters.</p>}

      {state === "success" && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table bg-white">
              <thead>
                <tr><th>Ticket No.</th><th>Created</th><th>Summary</th><th>Req. Priority</th><th>IT Priority</th><th>Status</th><th>Owner</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td><Link to={`/queue/${t.id}`}>{t.ticketNumber}</Link></td>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td>{t.summary}</td>
                    <td><PriorityBadge value={t.requestedPriority} /></td>
                    <td><PriorityBadge value={t.itPriority} /></td>
                    <td><StatusBadge value={t.currentStatus} /></td>
                    <td>{t.ticketOwnerName ?? <span className="text-muted">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {tickets.map((t) => (
              <Link to={`/queue/${t.id}`} key={t.id} className="card p-2 mb-2 text-decoration-none text-dark">
                <strong>{t.ticketNumber}</strong>
                <div>{t.summary}</div>
                <div className="d-flex gap-2 mt-1 flex-wrap">
                  <PriorityBadge value={t.requestedPriority} />
                  <StatusBadge value={t.currentStatus} />
                  <span className="small text-muted">{t.ticketOwnerName ?? "Unassigned"}</span>
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <nav className="mt-3">
              <ul className="pagination">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => p - 1)}>Previous</button>
                </li>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                  </li>
                ))}
                <li className={`page-item ${page >= pagination.totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => p + 1)}>Next</button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
