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

import NotFoundPage from "../../pages/NotFoundPage";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "../../contexts/ThemeContext";

describe("NotFoundPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders heading", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotFoundPage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(
      screen.getByRole("heading", { name: /404 - Page Not Found/i })
    ).toBeTruthy();
  });

  it("shows 404 message content", () => {
    render(
      <MemoryRouter>
        <ThemeProvider>
          <NotFoundPage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(document.body.textContent?.toLowerCase()).toContain("not found");
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <ThemeProvider>
          <NotFoundPage />
        </ThemeProvider>
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
