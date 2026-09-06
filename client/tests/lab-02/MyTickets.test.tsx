import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MyTickets from "../../src/lab2/MyTickets";
import { DevRequesterProvider } from "../../src/lab2/DevRequesterContext";
import * as api from "../../src/lab2/api";

beforeEach(() => {
  vi.restoreAllMocks();
  sessionStorage.setItem(
    "toktickit.devRequesterId",
    JSON.stringify({ id: 1, name: "Jennifer Anderson" })
  );
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <DevRequesterProvider>
        <MyTickets />
      </DevRequesterProvider>
    </MemoryRouter>
  );
}

describe("MyTickets (UI-06)", () => {
  it("shows the empty state when the requester has zero tickets", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
    renderScreen();
    await waitFor(() => expect(screen.getByText(/no tickets yet/i)).toBeInTheDocument());
  });

  it("shows the ticket list when data is returned", async () => {
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      data: [
        {
          id: 1,
          ticketNumber: "TKT-2026-000001",
          requesterId: 1,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Laptop battery drains quickly",
          description: "...",
          requestedPriority: "MEDIUM",
          itPriority: null,
          currentStatus: "NEW",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          attachments: [],
        },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });
    renderScreen();
    await waitFor(() =>
      expect(screen.getAllByText(/TKT-2026-000001/).length).toBeGreaterThan(0)
    );
  });

  it("shows a safe error state on API failure", async () => {
    vi.spyOn(api, "fetchTickets").mockRejectedValue(new Error("down"));
    renderScreen();
    await waitFor(() =>
      expect(screen.getByText(/Unable to load your tickets/i)).toBeInTheDocument()
    );
  });
});
