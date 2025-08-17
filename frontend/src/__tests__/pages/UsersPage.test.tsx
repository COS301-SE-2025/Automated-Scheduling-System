import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetAllUsers = vi.fn().mockResolvedValue([]);
vi.mock("../../services/userService", () => ({
  getAllUsers: (...args: any[]) => mockGetAllUsers(...args),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: "Admin" },
    permissions: [],
  }),
}));

vi.mock("../../services/api", () => ({
  __esModule: true,
  default: vi.fn().mockResolvedValue([]),
  ApiError: class ApiError extends Error {
    status: number | undefined;
    constructor(message: string, status?: number) {
      super(message);
      this.status = status;
    }
  },
}));

import UsersPage from "../../pages/UsersPage";
import { MemoryRouter } from "react-router-dom";

describe("UsersPage", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: any[]) => {
        const first = args[0] && String(args[0]);
        const msg = first ?? "";
        if (
          msg.includes("not wrapped in act(") ||
          msg.includes("was not wrapped in act(") ||
          msg.includes("An update to")
        ) {
          return;
        }
        originalConsoleError(...args);
      });
  });

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    consoleErrorSpy = null;
  });

  it("renders header and new user action", async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );

    const matches = await screen.findAllByText(/users/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("fetches users on mount", async () => {
    render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(mockGetAllUsers).toHaveBeenCalled());
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <UsersPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
