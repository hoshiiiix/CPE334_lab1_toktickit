import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ChangePassword from "../../src/lab3/ChangePassword";
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
        <ChangePassword />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("ChangePassword (UI-02)", () => {
  it("keeps Continue disabled until all password rules pass", () => {
    renderScreen();
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Current \(temporary\) password/i), { target: { value: "temp" } });
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "weak" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "weak" } });
    expect(continueBtn).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "Strong1!Pass" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "Strong1!Pass" } });
    expect(continueBtn).not.toBeDisabled();
  });

  it("shows a mismatch message when confirm differs from new password", () => {
    renderScreen();
    fireEvent.change(screen.getByLabelText(/^New password$/i), { target: { value: "Strong1!Pass" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/i), { target: { value: "Different1!" } });
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });
});
