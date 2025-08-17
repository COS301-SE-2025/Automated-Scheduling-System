import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetAllCompetencies = vi.fn().mockResolvedValue([]);
vi.mock("../../services/competencyService", () => ({
  getAllCompetencies: (...args: any[]) => mockGetAllCompetencies(...args),
  getAllCompetencyTypes: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("../../components/competency/CompetencyModal", () => ({
  __esModule: true,
  default: (props: any) =>
    props.isOpen ? (
      <div data-testid="competency-modal">
        <button onClick={() => props.onClose?.()}>close</button>
      </div>
    ) : null,
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

import CompetencyPage from "../../pages/CompetencyPage";
import { MemoryRouter } from "react-router-dom";

describe("CompetencyPage", () => {
  const user = userEvent.setup();

  beforeEach(() => vi.clearAllMocks());

  it("renders header and primary actions", async () => {
    render(
      <MemoryRouter>
        <CompetencyPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByText("Competency Management");
    expect(headings.length).toBeGreaterThan(0);
    expect(await screen.findByText("Add Competency")).toBeInTheDocument();
    expect(
      await screen.findByText("Manage Competency Types")
    ).toBeInTheDocument();
  });

  it("opens add competency modal when Add Competency clicked", async () => {
    render(
      <MemoryRouter>
        <CompetencyPage />
      </MemoryRouter>
    );
    await user.click(screen.getByText("Add Competency"));

    expect(await screen.findByTestId("competency-modal")).toBeInTheDocument();
  });

  it("fetches competencies on mount", async () => {
    render(
      <MemoryRouter>
        <CompetencyPage />
      </MemoryRouter>
    );
    await waitFor(() => expect(mockGetAllCompetencies).toHaveBeenCalled());
  });
});
