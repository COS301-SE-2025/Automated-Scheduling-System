import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: null, permissions: [] }),
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

import LandingPage from "../../pages/LandingPage";
import { MemoryRouter } from "react-router-dom";

describe("LandingPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders hero header", async () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByRole("heading", {
      name: /Automated Scheduling System|Welcome/i,
    });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("shows CTA if present", () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(document.querySelector("a[href*='signup'], button")).toBeTruthy();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
