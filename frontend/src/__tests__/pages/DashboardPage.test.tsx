import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mutable auth mock so tests can switch roles/permissions
const mockUser: any = { role: 'User', name: 'Test User' };
const mockPermissions: string[] = ['event-definitions','roles','rules','competencies'];
vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser, permissions: mockPermissions })
}));

// Service mocks
const mockGetScheduledEvents = vi.fn().mockResolvedValue([]);
const mockGetEmployeeViz = vi.fn().mockResolvedValue({ chart: [] });
vi.mock('../../services/eventService', () => ({
  getScheduledEvents: (...args: any[]) => mockGetScheduledEvents(...args)
}));
vi.mock('../../services/visualizationService', () => ({
  getEmployeeVisualizationData: (...args: any[]) => mockGetEmployeeViz(...args)
}));

// Keep api module mock if other imports depend on it (minimal stub)
vi.mock("../../services/api", () => ({
  __esModule: true,
  default: vi.fn(),
  ApiError: class ApiError extends Error { status?: number; constructor(msg: string, status?: number){ super(msg); this.status = status; }}
}));

import DashboardPage from "../../pages/DashboardPage";
import { MemoryRouter } from "react-router-dom";

describe("DashboardPage", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => { mockUser.role = 'User'; });

  it("renders header and welcome text", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    // Use findByText instead of role query to avoid any a11y name mismatches
    const heading = await screen.findByText(/welcome,\s*test user!/i);
    expect(heading).toBeInTheDocument();
  });

  it("contains primary quick actions if present", async () => {
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await screen.findByText(/welcome,\s*test user!/i);
    // Assert the Quick Actions section heading appears
    expect(await screen.findByText(/quick actions/i)).toBeInTheDocument();
  });

  it("renders without crashing", async () => {
    const { container } = render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    );
    await screen.findByText(/welcome,\s*test user!/i);
    expect(container).toBeTruthy();
  });

  it("handles widget fetch error gracefully", async () => {
    mockGetScheduledEvents.mockRejectedValueOnce(new Error('dash fail'));
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    const failure = await screen.findByText(/Could not load your upcoming events\./i);
    expect(failure).toBeInTheDocument();
  });

  it("renders additional admin blocks when role is Admin", async () => {
    mockUser.role = 'Admin';
    render(<MemoryRouter><DashboardPage /></MemoryRouter>);
    // Wait for admin-only Compliance Dashboard card
    const compliance = await screen.findByText(/Compliance Dashboard/i);
    expect(compliance).toBeInTheDocument();
    // Assert Manage Users feature block appears
    expect(await screen.findByText(/Manage Users/i)).toBeInTheDocument();
  });
});
