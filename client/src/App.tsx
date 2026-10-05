import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lab3/AuthContext";
import Login from "./lab3/Login";
import ChangePassword from "./lab3/ChangePassword";
import AppShell from "./lab2/AppShell";
import CreateTicket from "./lab2/CreateTicket";
import MyTickets from "./lab2/MyTickets";
import RequesterTicketDetail from "./lab2/RequesterTicketDetail";
import "./lab2/zen-green.css";
import StaffTicketQueue from "./lab3/StaffTicketQueue";
import StaffTicketDetail from "./lab3/StaffTicketDetail";
import UserManagement from "./lab3/UserManagement";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <p role="status">Loading…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.mustChangePassword) return <Navigate to="/change-password" replace />;
  return <AppShell>{children}</AppShell>;
}

function RequireRole({ roles, children }: { roles: string[]; children: JSX.Element }) {
  const { user } = useAuth();
  if (user && !roles.includes(user.role)) {
    // RequireAuth already wraps every protected route in AppShell, so render the message only.
    return <p role="alert">You don't have permission to view this.</p>;
  }
  return children;
}

function Routing() {
  const { user, loading } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user && !user.mustChangePassword ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/change-password"
        element={
          loading ? <p role="status">Loading…</p>
          : !user ? <Navigate to="/login" replace />
          : !user.mustChangePassword ? <Navigate to="/" replace />
          : <ChangePassword />
        }
      />

      <Route path="/tickets" element={<RequireAuth><RequireRole roles={["REQUESTER"]}><MyTickets /></RequireRole></RequireAuth>} />
      <Route path="/tickets/new" element={<RequireAuth><RequireRole roles={["REQUESTER"]}><CreateTicket /></RequireRole></RequireAuth>} />
      <Route path="/tickets/:id" element={<RequireAuth><RequireRole roles={["REQUESTER"]}><RequesterTicketDetail /></RequireRole></RequireAuth>} />

      <Route path="/queue" element={<RequireAuth><RequireRole roles={["IT_STAFF", "ADMINISTRATOR"]}><StaffTicketQueue /></RequireRole></RequireAuth>} />
      <Route path="/queue/:id" element={<RequireAuth><RequireRole roles={["IT_STAFF", "ADMINISTRATOR"]}><StaffTicketDetail /></RequireRole></RequireAuth>} />
      <Route path="/admin/users" element={<RequireAuth><RequireRole roles={["ADMINISTRATOR"]}><UserManagement /></RequireRole></RequireAuth>} />

      <Route
        path="/"
        element={
          <RequireAuth>
            <Navigate to={user?.role === "REQUESTER" ? "/tickets" : "/queue"} replace />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routing />
      </AuthProvider>
    </BrowserRouter>
  );
}
