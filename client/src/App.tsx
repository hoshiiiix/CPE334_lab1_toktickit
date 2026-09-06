import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DevRequesterProvider, useDevRequester } from "./lab2/DevRequesterContext";
import DevRequesterSelect from "./lab2/DevRequesterSelect";
import AppShell from "./lab2/AppShell";
import CreateTicket from "./lab2/CreateTicket";
import MyTickets from "./lab2/MyTickets";
import RequesterTicketDetail from "./lab2/RequesterTicketDetail";
import "./lab2/zen-green.css";

// AC-02: guard any requester-scoped route behind a selected Development Requester.
function RequireRequester({ children }: { children: JSX.Element }) {
  const { requesterId } = useDevRequester();
  if (!requesterId) return <Navigate to="/select-requester" replace />;
  return <AppShell>{children}</AppShell>;
}

function Routing() {
  return (
    <Routes>
      <Route path="/select-requester" element={<DevRequesterSelect />} />
      <Route
        path="/tickets"
        element={
          <RequireRequester>
            <MyTickets />
          </RequireRequester>
        }
      />
      <Route
        path="/tickets/new"
        element={
          <RequireRequester>
            <CreateTicket />
          </RequireRequester>
        }
      />
      <Route
        path="/tickets/:id"
        element={
          <RequireRequester>
            <RequesterTicketDetail />
          </RequireRequester>
        }
      />
      <Route path="*" element={<Navigate to="/tickets" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <DevRequesterProvider>
        <Routing />
      </DevRequesterProvider>
    </BrowserRouter>
  );
}
