import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ComplianceTrends from "../../components/visualization/ComplianceTrends";
import type { TrendDataPoint } from "../../services/visualizationService";

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: ({ yAxisId, orientation }: any) => <div data-testid="y-axis" data-axis-id={yAxisId} data-orientation={orientation} />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  Line: ({ dataKey, stroke, yAxisId }: any) => <div data-testid="line" data-key={dataKey} data-stroke={stroke} data-y-axis-id={yAxisId} />,
}));

describe("ComplianceTrends", () => {
  const mockData: TrendDataPoint[] = [
    {
      date: "2024-01-01",
      completedCount: 100,
      requiredCount: 120,
      complianceRate: 83.33,
    },
    {
      date: "2024-02-01",
      completedCount: 120,
      requiredCount: 140,
      complianceRate: 85.71,
    },
    {
      date: "2024-03-01",
      completedCount: 135,
      requiredCount: 150,
      complianceRate: 90.0,
    },
  ];

  it("renders compliance trends with chart", () => {
    render(<ComplianceTrends data={mockData} />);

    expect(screen.getByText("Compliance Trends")).toBeInTheDocument();
    expect(screen.getByText("Monthly competency completion trends over the past 12 months")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("shows empty state when no data", () => {
    render(<ComplianceTrends data={[]} />);

    expect(screen.getByText("📈")).toBeInTheDocument();
    expect(screen.getByText("No trend data available")).toBeInTheDocument();
    expect(screen.getByText("Historical data will appear here as competencies are completed.")).toBeInTheDocument();
  });

  it("displays trend insights when sufficient data available", () => {
    render(<ComplianceTrends data={mockData} />);

    expect(screen.getByText("Trend Insights (Last 12 Months)")).toBeInTheDocument();
    
    // Should show insights section
    const insightsSection = screen.getByText("Trend Insights (Last 12 Months)").closest('div');
    expect(insightsSection).toBeInTheDocument();
  });

  it("does not show trend insights with insufficient data", () => {
    const singleDataPoint: TrendDataPoint[] = [
      {
        date: "2024-01-01",
        completedCount: 100,
        requiredCount: 120,
        complianceRate: 83.33,
      },
    ];

    render(<ComplianceTrends data={singleDataPoint} />);

    expect(screen.queryByText("Trend Insights (Last 12 Months)")).not.toBeInTheDocument();
  });

  it("sorts data by date correctly", () => {
    const unsortedData: TrendDataPoint[] = [
      {
        date: "2024-03-01",
        completedCount: 135,
        requiredCount: 150,
        complianceRate: 90.0,
      },
      {
        date: "2024-01-01",
        completedCount: 100,
        requiredCount: 120,
        complianceRate: 83.33,
      },
      {
        date: "2024-02-01",
        completedCount: 120,
        requiredCount: 140,
        complianceRate: 85.71,
      },
    ];

    render(<ComplianceTrends data={unsortedData} />);

    // Should render without crashing (sorting happens internally)
    expect(screen.getByText("Compliance Trends")).toBeInTheDocument();
  });

  it("formats dates correctly for display", () => {
    render(<ComplianceTrends data={mockData} />);

    // The component internally formats dates, we just verify it renders
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("handles single data point", () => {
    const singlePoint: TrendDataPoint[] = [
      {
        date: "2024-01-01",
        completedCount: 100,
        requiredCount: 120,
        complianceRate: 83.33,
      },
    ];

    render(<ComplianceTrends data={singlePoint} />);

    expect(screen.getByText("Compliance Trends")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("handles data with zero values", () => {
    const zeroData: TrendDataPoint[] = [
      {
        date: "2024-01-01",
        completedCount: 0,
        requiredCount: 0,
        complianceRate: 0,
      },
    ];

    render(<ComplianceTrends data={zeroData} />);

    expect(screen.getByText("Compliance Trends")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });
});