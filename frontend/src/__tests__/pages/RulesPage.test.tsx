import { render, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "Admin" }, permissions: [] }),
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

import RulesPage from "../../pages/RulesPage";
import { MemoryRouter } from "react-router-dom";

describe("RulesPage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders without crashing", async () => {
    const { container } = render(
      <MemoryRouter>
        <RulesPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(container).toBeTruthy());
  });
});
