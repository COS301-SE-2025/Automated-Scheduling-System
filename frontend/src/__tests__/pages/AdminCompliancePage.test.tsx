import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the visualization service
const mockGetAdminComplianceData = vi.fn().mockResolvedValue({
  companyOverview: {
    totalEmployees: 50,
    totalCompetencies: 25,
    totalRequired: 200,
    totalCompleted: 150,
    overallComplianceRate: 75,
  },
  departmentBreakdown: [
    {
      positionCode: "DEV001",
      positionTitle: "Software Developer",
      employeeCount: 10,
      requiredCount: 50,
      completedCount: 40,
      complianceRate: 80,
      outstandingCount: 10,
    },
    {
      positionCode: "QA001",
      positionTitle: "Quality Assurance",
      employeeCount: 8,
      requiredCount: 40,
      completedCount: 35,
      complianceRate: 87.5,
      outstandingCount: 5,
    },
  ],
  competencyHotspots: [
    {
      competencyID: 1,
      competencyName: "Safety Training",
      competencyTypeName: "Mandatory",
      totalRequired: 50,
      totalCompleted: 30,
      incompleteCount: 20,
      incompleteRate: 40,
    },
  ],
  trendData: [
    {
      date: "2024-01-01",
      completedCount: 100,
      requiredCount: 120,
      complianceRate: 83.33,
    },
    {
      date: "2024-02-01",
      completedCount: 120,
      requiredCount: 150,
      complianceRate: 80,
    },
  ],
  statusDistribution: [
    { status: "completed", count: 150, label: "Completed" },
    { status: "required", count: 50, label: "Required" },
  ],
});

vi.mock("../../services/visualizationService", () => ({
  getAdminComplianceData: (...args: any[]) => mockGetAdminComplianceData(...args),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: "Admin" },
    permissions: [],
  }),
}));

// Mock the visualization components
vi.mock("../../components/visualization/ComplianceOverview", () => ({
  __esModule: true,
  default: ({ data }: any) => (
    <div data-testid="compliance-overview">
      Compliance Overview - Total Employees: {data.companyOverview.totalEmployees}
    </div>
  ),
}));

vi.mock("../../components/visualization/DepartmentBreakdown", () => ({
  __esModule: true,
  default: ({ data, onFilterChange }: any) => (
    <div data-testid="department-breakdown">
      <div>Department Breakdown</div>
      {data.map((dept: any, index: number) => (
        <div key={index}>{dept.positionTitle}: {dept.complianceRate}%</div>
      ))}
      <button onClick={() => onFilterChange?.({ positionCodes: ["DEV001"] })}>
        Filter Department
      </button>
    </div>
  ),
}));

vi.mock("../../components/visualization/CompetencyHotspots", () => ({
  __esModule: true,
  default: ({ data }: any) => (
    <div data-testid="competency-hotspots">
      Competency Hotspots
      {data.map((hotspot: any, index: number) => (
        <div key={index}>{hotspot.competencyName}: {hotspot.incompleteRate}%</div>
      ))}
    </div>
  ),
}));

vi.mock("../../components/visualization/ComplianceTrends", () => ({
  __esModule: true,
  default: ({ data }: any) => (
    <div data-testid="compliance-trends">
      Compliance Trends ({data.length} data points)
    </div>
  ),
}));

vi.mock("../../components/visualization/ExportActions", () => ({
  __esModule: true,
  default: () => (
    <button data-testid="export-actions">
      Export Data
    </button>
  ),
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

import AdminCompliancePage from "../../pages/AdminCompliancePage";
import { MemoryRouter } from "react-router-dom";

describe("AdminCompliancePage", () => {
  const user = userEvent.setup();
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | null = null;
  const originalConsoleError = console.error;

  beforeEach(() => {
    vi.clearAllMocks();

    consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation((...args: any[]) => {
        const first = args[0] && String(args[0]);
        const msg = first ?? "";
        if (
          msg.includes("not wrapped in act(") ||
          msg.includes("was not wrapped in act(") ||
          msg.includes("An update to")
        ) {
          return;
        }
        originalConsoleError(...args);
      });
  });

  afterEach(() => {
    if (consoleErrorSpy) consoleErrorSpy.mockRestore();
    consoleErrorSpy = null;
  });

  it("renders header and main content", async () => {
    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    expect(
      await screen.findByText("Company Compliance Overview")
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Monitor competency compliance across the organization")
    ).toBeInTheDocument();
  });

  it("shows loading state initially", async () => {
    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading compliance data...")).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading compliance data...")).not.toBeInTheDocument();
    });
  });

  it("fetches compliance data on mount", async () => {
    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetAdminComplianceData).toHaveBeenCalled();
    });
  });


  it("handles refresh button click", async () => {
    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(mockGetAdminComplianceData).toHaveBeenCalledTimes(1);
    });

    const refreshButton = await screen.findByText("Refresh");
    await user.click(refreshButton);

    await waitFor(() => {
      expect(mockGetAdminComplianceData).toHaveBeenCalledTimes(2);
    });
  });

  it("handles filter changes", async () => {
    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("department-breakdown")).toBeInTheDocument();
    });

    const filterButton = screen.getByText("Filter Department");
    await user.click(filterButton);

    await waitFor(() => {
      expect(mockGetAdminComplianceData).toHaveBeenCalledWith({ positionCodes: ["DEV001"] });
    });
  });

  it("shows performance warning for large datasets", async () => {
    mockGetAdminComplianceData.mockResolvedValueOnce({
      companyOverview: {
        totalEmployees: 150, // Large dataset
        totalCompetencies: 50,
        totalRequired: 500,
        totalCompleted: 400,
        overallComplianceRate: 80,
      },
      departmentBreakdown: [],
      competencyHotspots: [],
      trendData: [],
      statusDistribution: [],
    });

    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Performance Note:/)).toBeInTheDocument();
      expect(screen.getByText(/You have a large dataset \(150 employees\)/)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockGetAdminComplianceData.mockRejectedValueOnce(new Error("API Error"));

    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load compliance dashboard data")).toBeInTheDocument();
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });
  });

  it("handles retry after error", async () => {
    mockGetAdminComplianceData
      .mockRejectedValueOnce(new Error("API Error"))
      .mockResolvedValueOnce({
        companyOverview: {
          totalEmployees: 50,
          totalCompetencies: 25,
          totalRequired: 200,
          totalCompleted: 150,
          overallComplianceRate: 75,
        },
        departmentBreakdown: [],
        competencyHotspots: [],
        trendData: [],
        statusDistribution: [],
      });

    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Try again")).toBeInTheDocument();
    });

    const retryButton = screen.getByText("Try again");
    await user.click(retryButton);

    await waitFor(() => {
      expect(mockGetAdminComplianceData).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Company Compliance Overview")).toBeInTheDocument();
    });
  });

  it("handles empty data state", async () => {
    mockGetAdminComplianceData.mockResolvedValueOnce(null);

    render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No compliance data available")).toBeInTheDocument();
    });
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <AdminCompliancePage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});