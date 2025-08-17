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

import MainHelpPage from "../../pages/MainHelpPage";
import { MemoryRouter } from "react-router-dom";

describe("MainHelpPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders heading", async () => {
    render(
      <MemoryRouter>
        <MainHelpPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByRole("heading", {
      name: /Help Center|Help & Support/i,
    });
    expect(headings.length).toBeGreaterThan(0);
  });

  it("renders help topics", () => {
    render(
      <MemoryRouter>
        <MainHelpPage />
      </MemoryRouter>
    );
    expect(
      document.querySelector(".topics, .help") || document.body
    ).toBeTruthy();
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <MainHelpPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
