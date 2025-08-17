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

import SignupPage from "../../pages/SignupPage";
import { MemoryRouter } from "react-router-dom";

describe("SignupPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <SignupPage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});
