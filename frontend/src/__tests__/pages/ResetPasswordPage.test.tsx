import { render } from "@testing-library/react";
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

import ResetPasswordPage from "../../pages/ResetPasswordPage";
import { MemoryRouter } from "react-router-dom";

describe("ResetPasswordPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <ResetPasswordPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
