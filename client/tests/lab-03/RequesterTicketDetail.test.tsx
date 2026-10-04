import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequesterTicketDetail from "../../src/lab2/RequesterTicketDetail";
import * as api from "../../src/lab2/api";
import * as staffApi from "../../src/lab3/staffApi";

beforeEach(() => {
  vi.restoreAllMocks();
});

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/tickets/1"]}>
      <Routes>
        <Route path="/tickets/:id" element={<RequesterTicketDetail />} />
      </Routes>
    </MemoryRouter>
  );
}

const baseTicket = {
  id: 1, ticketNumber: "TKT-2026-000001", requesterId: 1, categoryId: 1, relatedSystemId: 1,
  summary: "Laptop battery drains quickly", description: "The battery drains much faster than usual.",
  requestedPriority: "MEDIUM", itPriority: "MEDIUM", currentStatus: "IN_PROGRESS",
  requesterMarkedResolved: false, ticketOwnerId: null, ticketOwnerName: null,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), attachments: [],
} as any;

const existingComment = {
  id: 1, authorId: 9, authorName: "Michael Brown", authorRole: "IT_STAFF",
  content: "We are investigating.", createdAt: new Date().toISOString(),
};

describe("RequesterTicketDetail — Public Comments and Problem Appears Resolved (UI-07)", () => {
  it("shows existing public comments with the author and role", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([existingComment]);
    renderScreen();

    await waitFor(() => expect(screen.getByText("We are investigating.")).toBeInTheDocument());
    expect(screen.getByText("Michael Brown")).toBeInTheDocument();
    expect(screen.getByText("IT STAFF")).toBeInTheDocument();
  });

  it("never shows Internal Notes to a Requester", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    const notes = vi.spyOn(staffApi, "fetchNotes");
    renderScreen();

    await waitFor(() => expect(screen.getByText(/Public Comments/i)).toBeInTheDocument());
    expect(screen.queryByText(/Internal Notes/i)).not.toBeInTheDocument();
    expect(notes).not.toHaveBeenCalled();
  });

  it("rejects an empty comment with a validation message and does not call the API", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    const post = vi.spyOn(staffApi, "postComment");
    renderScreen();

    await waitFor(() => expect(screen.getByRole("button", { name: /Post Comment/i })).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Add a comment/i), { target: { value: "   " } });
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));

    expect(screen.getByText(/Comment cannot be empty/i)).toBeInTheDocument();
    expect(post).not.toHaveBeenCalled();
  });

  it("posts a comment and appends it to the list", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    vi.spyOn(staffApi, "postComment").mockResolvedValue({
      id: 2, authorId: 1, authorName: "Jennifer Anderson", authorRole: "REQUESTER",
      content: "Thanks for the update.", createdAt: new Date().toISOString(),
    });
    renderScreen();

    await waitFor(() => expect(screen.getByLabelText(/Add a comment/i)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText(/Add a comment/i), { target: { value: "Thanks for the update." } });
    fireEvent.click(screen.getByRole("button", { name: /Post Comment/i }));

    await waitFor(() => expect(screen.getByText("Thanks for the update.")).toBeInTheDocument());
  });

  it("still shows the ticket when comments fail to load", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockRejectedValue(new Error("boom"));
    renderScreen();

    await waitFor(() => expect(screen.getByText(/TKT-2026-000001/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Unable to load comments/i)).toBeInTheDocument());
  });

  it("marks the problem as resolved and replaces the button with a confirmation", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    vi.spyOn(api, "markTicketResolved").mockResolvedValue({ requesterMarkedResolved: true });
    renderScreen();

    const button = await screen.findByRole("button", { name: /Problem Appears Resolved/i });
    fireEvent.click(button);

    expect(await screen.findByText(/You told IT Staff this problem appears resolved/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });

  it("hides the Problem Appears Resolved button on a Closed ticket", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue({ ...baseTicket, currentStatus: "CLOSED" });
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    renderScreen();

    await waitFor(() => expect(screen.getByText(/TKT-2026-000001/)).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Problem Appears Resolved/i })).not.toBeInTheDocument();
  });

  it("shows a safe error when marking resolved fails", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    vi.spyOn(staffApi, "fetchComments").mockResolvedValue([]);
    vi.spyOn(api, "markTicketResolved").mockRejectedValue(new api.ApiError(500, "Unable to send this right now."));
    renderScreen();

    fireEvent.click(await screen.findByRole("button", { name: /Problem Appears Resolved/i }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(/Unable to send this right now/i));
  });
});
