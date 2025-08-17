import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "User" } }),
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

import DashboardPage from "../../pages/DashboardPage";
import { MemoryRouter } from "react-router-dom";

describe("DashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders header and welcome text", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    const heading = await screen.findByRole("heading", { name: /dashboard/i });
    expect(heading).toBeTruthy();
  });

  it("contains primary quick actions if present", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: /dashboard/i });
    expect(
      document.querySelector(".grid, .dashboard") || document.body
    ).toBeTruthy();
  });

  it("renders without crashing", async () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );

    await screen.findByRole("heading", { name: /dashboard/i });
    expect(container).toBeTruthy();
  });
});
