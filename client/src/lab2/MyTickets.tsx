import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchTickets, Ticket, Pagination } from "./api";
import { useDevRequester } from "./DevRequesterContext";

type LoadState = "loading" | "success" | "empty" | "no-results" | "error";

function PriorityBadge({ value }: { value: string }) {
  const cls =
    value === "HIGH" ? "tk-badge-high" : value === "MEDIUM" ? "tk-badge-medium" : "tk-badge-low";
  return <span className={`badge ${cls}`}>{value}</span>;
}

function StatusBadge({ value }: { value: string }) {
  return <span className="badge tk-badge-new">{value}</span>;
}

export default function MyTickets() {
  const { requesterId } = useDevRequester();
  const [state, setState] = useState<LoadState>("loading");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [everHadTickets, setEverHadTickets] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [requestedPriority, setRequestedPriority] = useState("");
  const [status, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);

  function load() {
    if (!requesterId) return;
    setState("loading");
    fetchTickets(requesterId, {
      search: search || undefined,
      categoryId: categoryId ? Number(categoryId) : undefined,
      requestedPriority: requestedPriority || undefined,
      status: status || undefined,
      page,
    })
      .then((res) => {
        setTickets(res.data);
        setPagination(res.pagination);
        const hasFilters = Boolean(search || categoryId || requestedPriority || status);
        if (res.data.length > 0) {
          setEverHadTickets(true);
          setState("success");
        } else if (!hasFilters && !everHadTickets) {
          setState("empty");
        } else {
          setState("no-results");
        }
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requesterId, page]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function clearFilters() {
    setSearch("");
    setCategoryId("");
    setRequestedPriority("");
    setStatusFilter("");
    setPage(1);
    setTimeout(load, 0);
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="h4 mb-0">My Tickets</h1>
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}>
            Clear Filters
          </button>
          <Link to="/tickets/new" className="btn btn-success btn-sm">
            + Create Ticket
          </Link>
        </div>
      </div>

      <form className="row g-2 mb-3" onSubmit={handleSearchSubmit}>
        <div className="col-md-4">
          <input
            className="form-control"
            placeholder="Search by ticket number or summary…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-3">
          <select
            className="form-select"
            value={requestedPriority}
            onChange={(e) => {
              setRequestedPriority(e.target.value);
              setPage(1);
              setTimeout(load, 0);
            }}
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
        <div className="col-md-3">
          <button type="submit" className="btn btn-outline-success w-100">
            Search
          </button>
        </div>
      </form>

      {state === "loading" && <p role="status">Loading tickets…</p>}
      {state === "error" && (
        <p className="text-danger">Unable to load your tickets right now.</p>
      )}
      {state === "empty" && <p>You have no tickets yet. Create your first one!</p>}
      {state === "no-results" && <p>No tickets match your current search/filters.</p>}

      {state === "success" && (
        <>
          <div className="table-responsive d-none d-md-block">
            <table className="table bg-white">
              <thead>
                <tr>
                  <th>Ticket No.</th>
                  <th>Created</th>
                  <th>Summary</th>
                  <th>Requested Priority</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td>
                      <Link to={`/tickets/${t.id}`}>{t.ticketNumber}</Link>
                    </td>
                    <td>{new Date(t.createdAt).toLocaleString()}</td>
                    <td>{t.summary}</td>
                    <td>
                      <PriorityBadge value={t.requestedPriority} />
                    </td>
                    <td>
                      <StatusBadge value={t.currentStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-md-none">
            {tickets.map((t) => (
              <Link
                to={`/tickets/${t.id}`}
                key={t.id}
                className="card p-2 mb-2 text-decoration-none text-dark"
              >
                <strong>{t.ticketNumber}</strong>
                <div>{t.summary}</div>
                <div className="d-flex gap-2 mt-1">
                  <PriorityBadge value={t.requestedPriority} />
                  <StatusBadge value={t.currentStatus} />
                </div>
              </Link>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <nav className="mt-3">
              <ul className="pagination">
                <li className={`page-item ${page <= 1 ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </button>
                </li>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                  <li key={p} className={`page-item ${p === page ? "active" : ""}`}>
                    <button className="page-link" onClick={() => setPage(p)}>
                      {p}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page >= pagination.totalPages ? "disabled" : ""}`}>
                  <button className="page-link" onClick={() => setPage((p) => p + 1)}>
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
