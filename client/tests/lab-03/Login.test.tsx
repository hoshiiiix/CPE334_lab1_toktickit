import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Login from "../../src/lab3/Login";
import { AuthProvider } from "../../src/lab3/AuthContext";
import * as api from "../../src/lab2/api";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(api, "fetchMe").mockRejectedValue(new Error("not authenticated"));
});

function renderScreen() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Login (UI-01)", () => {
  it("shows a generic error message on failed login", async () => {
    vi.spyOn(api, "login").mockRejectedValue(new api.ApiError(401, "Invalid email or password"));
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "a@example.com" } });
    // Exact string avoids matching the "Show password" toggle button's aria-label.
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "wrong" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() =>
      expect(screen.getByText(/Invalid email or password/i)).toBeInTheDocument()
    );
  });

  it("shows the busy state while submitting", async () => {
    vi.spyOn(api, "login").mockReturnValue(new Promise(() => {}));
    renderScreen();

    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "a@example.com" } });
    fireEvent.change(screen.getByLabelText("Password"), { target: { value: "somepassword" } });
    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    await waitFor(() => expect(screen.getByRole("button", { name: /Signing in/i })).toBeDisabled());
  });
});
