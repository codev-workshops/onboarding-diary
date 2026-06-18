import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { LoginPage } from "./LoginPage";

const loginMock = vi.fn();
const navigateMock = vi.fn();

vi.mock("../auth/AuthContext", () => ({
  useAuth: () => ({ login: loginMock }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

function renderPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    loginMock.mockReset();
    navigateMock.mockReset();
  });

  it("submits credentials and navigates on success", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), "admin@acme.com");
    await userEvent.type(screen.getByLabelText(/password/i), "password12345");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("admin@acme.com", "password12345"));
    expect(navigateMock).toHaveBeenCalledWith("/profile", { replace: true });
  });

  it("shows an error message when login fails", async () => {
    loginMock.mockRejectedValueOnce({ response: { data: { message: "Invalid email or password" } } });
    renderPage();

    await userEvent.type(screen.getByLabelText(/email/i), "admin@acme.com");
    await userEvent.type(screen.getByLabelText(/password/i), "wrong");
    await userEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
