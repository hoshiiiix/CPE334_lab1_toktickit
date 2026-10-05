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

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "createdAt:desc", label: "Newest first" },
  { value: "createdAt:asc", label: "Oldest first" },
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "ticketNumber:asc", label: "Ticket No. (low to high)" },
  { value: "ticketNumber:desc", label: "Ticket No. (high to low)" },
];

export default function StaffTicketQueue() {
  const [state, setState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sortKey, setSortKey] = useState("createdAt:desc");
  const [page, setPage] = useState(1);
  const [reloadToken, setReloadToken] = useState(0);

  // One effect owns loading: any change of search, status, sort or page refetches with the current values.
  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const [sort, order] = sortKey.split(":");
    const params: StaffTicketListParams = {
      search: appliedSearch || undefined,
      status: status || undefined,
      sort,
      order: order as "asc" | "desc",
      page,
    };
    fetchStaffTickets(params)
      .then((res) => {
        if (cancelled) return;
        setTickets(res.data);
        setPagination(res.pagination);
        const hasFilters = Boolean(appliedSearch || status);
        if (res.data.length > 0) setState("success");
        else setState(hasFilters ? "no-results" : "empty");
      })
      .catch((err) => {
        if (!cancelled) setState(err?.status === 403 ? "forbidden" : "error");
      });
    return () => { cancelled = true; };
  }, [appliedSearch, status, sortKey, page, reloadToken]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
    setReloadToken((n) => n + 1);
  }

  return (
    <div>
      <h1 className="h4 mb-3">My Queue</h1>

      <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-md-4">
          <input className="form-control" aria-label="Search tickets" placeholder="Search by ticket number or summary…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="col-md-3 col-6">
          <select className="form-select" aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CLOSED", "REOPENED", "CANCELLED"].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
            ))}
          </select>
        </div>
        <div className="col-md-3 col-6">
          <select className="form-select" aria-label="Sort tickets" value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}>
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="col-md-2">
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
          <div className="table-responsive d-none d-lg-block">
            <table className="table bg-white">
              <thead>
                <tr><th>Ticket No.</th><th>Created</th><th>Summary</th><th>Req. Priority</th><th>IT Priority</th><th>Status</th><th>Owner</th></tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="text-nowrap"><Link to={`/queue/${t.id}`}>{t.ticketNumber}</Link></td>
                    <td className="text-nowrap small">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td>{t.summary}</td>
                    <td><PriorityBadge value={t.requestedPriority} /></td>
                    <td><PriorityBadge value={t.itPriority} /></td>
                    <td><StatusBadge value={t.currentStatus} /></td>
                    <td className="text-nowrap">{t.ticketOwnerName ?? <span className="text-muted">Unassigned</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-lg-none">
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
