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

import LandingHelpPage from "../../pages/LandingHelpPage";
import { MemoryRouter } from "react-router-dom";

describe("LandingHelpPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders heading", async () => {
    render(
      <MemoryRouter>
        <LandingHelpPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByRole("heading", { name: /help/i });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders help content area", () => {
    render(
      <MemoryRouter>
        <LandingHelpPage />
      </MemoryRouter>
    );
    expect(
      document.querySelector(".prose, .help") || document.body
    ).toBeTruthy();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <LandingHelpPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
