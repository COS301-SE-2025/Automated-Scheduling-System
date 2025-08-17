import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: "Admin" },
    permissions: [],
  }),
}));

const mockGetRoles = vi.fn().mockResolvedValue([]);
vi.mock("../../services/roleService", () => ({
  getAllRoles: (...args: any[]) => mockGetRoles(...args),
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

import RolesPage from "../../pages/RolesPage";
import { MemoryRouter } from "react-router-dom";

describe("RolesPage", () => {
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

  it("renders header and admin controls", async () => {
    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByRole("heading", { name: /Roles/i });
    expect(headings.length).toBeGreaterThan(0);
    expect(screen.getByText(/New Role/i)).toBeTruthy();
  });

  it("fetches roles on mount", async () => {
    render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(mockGetRoles).toHaveBeenCalled());
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <RolesPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
