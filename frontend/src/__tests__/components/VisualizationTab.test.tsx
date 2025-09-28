import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import VisualizationTab from "../../components/visualization/VisualizationTab";
import type { VisualizationData } from "../../services/visualizationService";

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Pie: ({ dataKey }: any) => <div data-testid="pie" data-key={dataKey} />,
  Bar: ({ dataKey }: any) => <div data-testid="bar" data-key={dataKey} />,
  Cell: () => <div data-testid="cell" />,
}));

describe("VisualizationTab", () => {
  const mockData: VisualizationData = {
    employee: {
      employeeNumber: "EMP001",
      name: "John Doe",
      positionCode: "DEV001",
      positionTitle: "Software Developer",
    },
    completionOverview: {
      totalRequired: 10,
      totalCompleted: 8,
      completionRate: 80,
      totalOutstanding: 2,
    },
    competencyBreakdown: [
      {
        competencyID: 1,
        competencyName: "JavaScript Fundamentals",
        competencyTypeName: "Technical",
        status: "completed",
        achievementDate: "2024-01-15",
        expiryDate: "2025-01-15",
      },
      {
        competencyID: 2,
        competencyName: "React Advanced",
        competencyTypeName: "Technical",
        status: "required",
      },
      {
        competencyID: 3,
        competencyName: "Safety Training",
        competencyTypeName: "Mandatory",
        status: "expired",
        achievementDate: "2023-01-01",
        expiryDate: "2024-01-01",
      },
    ],
    statusBreakdown: [
      { status: "completed", count: 8, label: "Completed" },
      { status: "required", count: 2, label: "Required" },
    ],
  };


  it("shows error state", () => {
    render(<VisualizationTab data={null} loading={false} error="Failed to load data" />);

    expect(screen.getByText("Failed to load data")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<VisualizationTab data={null} loading={false} error={null} />);

    expect(screen.getByText("No visualization data available")).toBeInTheDocument();
  });


  it("shows celebration message for 100% completion", () => {
    const fullCompletionData: VisualizationData = {
      ...mockData,
      completionOverview: {
        ...mockData.completionOverview,
        completionRate: 100,
        totalCompleted: 10,
        totalOutstanding: 0,
      },
    };

    render(<VisualizationTab data={fullCompletionData} loading={false} error={null} />);

    expect(screen.getByText(/Congratulations/)).toBeInTheDocument();
  });

  it("renders pie chart", () => {
    render(<VisualizationTab data={mockData} loading={false} error={null} />);

    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
    expect(screen.getByTestId("pie")).toBeInTheDocument();
  });


  it("displays competency details table", () => {
    render(<VisualizationTab data={mockData} loading={false} error={null} />);

    expect(screen.getByText("JavaScript Fundamentals")).toBeInTheDocument();
    expect(screen.getByText("React Advanced")).toBeInTheDocument();
    expect(screen.getByText("Safety Training")).toBeInTheDocument();
    
    // Check for competency types
    expect(screen.getAllByText("Technical")).toHaveLength(2);
    expect(screen.getByText("Mandatory")).toBeInTheDocument();
  });

  it("shows different status styles in table", () => {
    render(<VisualizationTab data={mockData} loading={false} error={null} />);

    // Should have status badges - use getAllByText to handle multiple instances
    const completedBadges = screen.getAllByText("Completed");
    const requiredBadge = screen.getByText("Required");
    const expiredBadge = screen.getByText("Expired");

    expect(completedBadges.length).toBeGreaterThan(0);
    expect(requiredBadge).toBeInTheDocument();
    expect(expiredBadge).toBeInTheDocument();
  });

  it("displays achievement and expiry dates", () => {
    render(<VisualizationTab data={mockData} loading={false} error={null} />);
    // Component uses toLocaleDateString with environment locale; allow common variants
    // Acceptable patterns for 15 Jan 2024: 1/15/2024, 01/15/2024, 2024/01/15, 2024-01-15, 15/01/2024
    const achievementPattern = /(^|\s)(?:2024[/-]0?1[/-]15|0?1[/-]15[/-]2024|15[/-]0?1[/-]2024)(\s|$)/;
    const expiryPattern = /(^|\s)(?:2025[/-]0?1[/-]15|0?1[/-]15[/-]2025|15[/-]0?1[/-]2025)(\s|$)/;
    expect(screen.getByText(achievementPattern)).toBeInTheDocument();
    expect(screen.getByText(expiryPattern)).toBeInTheDocument();
  });

  it("handles competencies without dates", () => {
    const dataWithNoDates: VisualizationData = {
      ...mockData,
      competencyBreakdown: [
        {
          competencyID: 1,
          competencyName: "No Dates Competency",
          competencyTypeName: "Technical",
          status: "required",
        },
      ],
    };

    render(<VisualizationTab data={dataWithNoDates} loading={false} error={null} />);

    expect(screen.getByText("No Dates Competency")).toBeInTheDocument();
    expect(screen.getAllByText("—")).toHaveLength(1); // Only one missing date field shows "—"
  });

  it("shows message for new users with no requirements", () => {
    const noRequirementsData: VisualizationData = {
      ...mockData,
      completionOverview: {
        totalRequired: 0,
        totalCompleted: 0,
        completionRate: 0,
        totalOutstanding: 0,
      },
    };

    render(<VisualizationTab data={noRequirementsData} loading={false} error={null} />);

    expect(screen.getByText(/No Competency Requirements Yet/)).toBeInTheDocument();
    expect(screen.getByText(/Your competency requirements/)).toBeInTheDocument();
  });

  it("formats completion rate correctly", () => {
    const decimalData: VisualizationData = {
      ...mockData,
      completionOverview: {
        ...mockData.completionOverview,
        completionRate: 75.5,
      },
    };

    render(<VisualizationTab data={decimalData} loading={false} error={null} />);

    expect(screen.getByText("75.5%")).toBeInTheDocument();
  });

  it("handles missing status breakdown data", () => {
    const noStatusData: VisualizationData = {
      ...mockData,
      statusBreakdown: [],
    };

    render(<VisualizationTab data={noStatusData} loading={false} error={null} />);

    // Should show empty state message for competency status overview
    expect(screen.getByText("No competency data available")).toBeInTheDocument();
  });
});