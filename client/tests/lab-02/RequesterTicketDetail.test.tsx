import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import RequesterTicketDetail from "../../src/lab2/RequesterTicketDetail";
import * as api from "../../src/lab2/api";
import { ApiError } from "../../src/lab2/api";

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
  requestedPriority: "MEDIUM", itPriority: null, currentStatus: "NEW",
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  attachments: [{ id: 1, originalFilename: "photo.jpg", mimeType: "image/jpeg", sizeBytes: 1000, uploadedAt: "", isRemoved: false, removedAt: null, removedReason: null }],
} as any;

describe("RequesterTicketDetail", () => {
  it("renders read-only ticket fields and attachments", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    renderScreen();
    await waitFor(() => expect(screen.getByText(/TKT-2026-000001/)).toBeInTheDocument());
    expect(screen.getByDisplayValue(/Laptop battery drains quickly/)).toHaveAttribute("readOnly");
    expect(screen.getByText("photo.jpg")).toBeInTheDocument();
  });

  it("shows not-found when the ticket is not owned by the current requester", async () => {
    vi.spyOn(api, "fetchTicket").mockRejectedValue(new ApiError(404, "Ticket not found"));
    renderScreen();
    await waitFor(() => expect(screen.getByText(/Ticket not found/i)).toBeInTheDocument());
  });

  it("removing an attachment requires a reason before confirming (AttachmentSection)", async () => {
    vi.spyOn(api, "fetchTicket").mockResolvedValue(baseTicket);
    renderScreen();
    await waitFor(() => expect(screen.getByText("photo.jpg")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Remove photo.jpg/i }));
    expect(screen.getByRole("button", { name: /Confirm Removal/i })).toBeDisabled();
  });
});
