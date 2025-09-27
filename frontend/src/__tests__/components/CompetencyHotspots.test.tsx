import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import CompetencyHotspots from "../../components/visualization/CompetencyHotspots";
import type { CompetencyHotspotItem } from "../../services/visualizationService";

// Mock Recharts
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: ({ dataKey }: any) => <div data-testid="x-axis" data-key={dataKey} />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Bar: ({ dataKey, fill }: any) => <div data-testid="bar" data-key={dataKey} data-fill={fill} />,
}));

describe("CompetencyHotspots", () => {
  const mockData: CompetencyHotspotItem[] = [
    {
      competencyID: 1,
      competencyName: "Safety Training",
      competencyTypeName: "Mandatory",
      totalRequired: 100,
      totalCompleted: 60,
      incompleteCount: 40,
      incompleteRate: 40,
    },
    {
      competencyID: 2,
      competencyName: "Advanced JavaScript Programming",
      competencyTypeName: "Technical",
      totalRequired: 50,
      totalCompleted: 30,
      incompleteCount: 20,
      incompleteRate: 40,
    },
    {
      competencyID: 3,
      competencyName: "Team Leadership",
      competencyTypeName: "Soft Skills",
      totalRequired: 25,
      totalCompleted: 20,
      incompleteCount: 5,
      incompleteRate: 20,
    },
  ];

  it("renders competency hotspots with chart", () => {
    render(<CompetencyHotspots data={mockData} />);

    expect(screen.getByText("Top Competency Gaps")).toBeInTheDocument();
    expect(screen.getByText("Competencies with the highest number of incomplete assignments")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();
  });

  it("displays competency data in table", () => {
    render(<CompetencyHotspots data={mockData} />);

    expect(screen.getByText("Safety Training")).toBeInTheDocument();
    expect(screen.getByText("Advanced JavaScript Programming")).toBeInTheDocument();
    expect(screen.getByText("Team Leadership")).toBeInTheDocument();
    
    // Check for competency types
    expect(screen.getByText("Mandatory")).toBeInTheDocument();
    expect(screen.getByText("Technical")).toBeInTheDocument();
    expect(screen.getByText("Soft Skills")).toBeInTheDocument();
  });

  it("sorts data by incomplete count (highest first)", () => {
    render(<CompetencyHotspots data={mockData} />);
    
    // Safety Training has highest incomplete count (40), so should be first
    const rows = screen.getAllByRole("row");
    // Skip header row (index 0)
    expect(rows[1]).toHaveTextContent("Safety Training");
  });

  it("truncates long competency names", () => {
    const longNameData: CompetencyHotspotItem[] = [
      {
        competencyID: 1,
        competencyName: "Very Long Competency Name That Should Be Truncated",
        competencyTypeName: "Technical",
        totalRequired: 50,
        totalCompleted: 30,
        incompleteCount: 20,
        incompleteRate: 40,
      },
    ];

    render(<CompetencyHotspots data={longNameData} />);
    
    // Should truncate and show full name in table
    expect(screen.getByText("Very Long Competency Name That Should Be Truncated")).toBeInTheDocument();
  });

  it("shows empty state when no gaps found", () => {
    render(<CompetencyHotspots data={[]} />);

    expect(screen.getByText("🎉")).toBeInTheDocument();
    expect(screen.getByText("No competency gaps found!")).toBeInTheDocument();
    expect(screen.getByText("All required competencies are completed.")).toBeInTheDocument();
  });

  it("limits display to top 10 competencies", () => {
    const manyCompetencies: CompetencyHotspotItem[] = Array.from({ length: 15 }, (_, i) => ({
      competencyID: i + 1,
      competencyName: `Competency ${i + 1}`,
      competencyTypeName: "Technical",
      totalRequired: 50,
      totalCompleted: 30,
      incompleteCount: 20 - i, // Decreasing incomplete count
      incompleteRate: 40,
    }));

    render(<CompetencyHotspots data={manyCompetencies} />);

    expect(screen.getByText("Showing top 10 of 15 competencies with gaps")).toBeInTheDocument();
    
    // Should show first 10 competencies
    expect(screen.getByText("Competency 1")).toBeInTheDocument();
    expect(screen.getByText("Competency 10")).toBeInTheDocument();
    
    // Should not show beyond 10
    expect(screen.queryByText("Competency 11")).not.toBeInTheDocument();
  });

  it("displays correct incomplete rates", () => {
    render(<CompetencyHotspots data={mockData} />);

    // Check that incomplete rates are displayed correctly
    const table = screen.getByRole("table");
    expect(table).toHaveTextContent("40.0%"); // Safety Training
    expect(table).toHaveTextContent("20.0%"); // Team Leadership
  });

  it("shows competency counts correctly", () => {
    render(<CompetencyHotspots data={mockData} />);

    const table = screen.getByRole("table");
    
    // Check required counts
    expect(table).toHaveTextContent("100"); // Safety Training total required
    expect(table).toHaveTextContent("50");  // JavaScript total required
    expect(table).toHaveTextContent("25");  // Team Leadership total required
    
    // Check incomplete counts
    expect(table).toHaveTextContent("40"); // Safety Training incomplete
    expect(table).toHaveTextContent("20"); // JavaScript incomplete
    expect(table).toHaveTextContent("5");  // Team Leadership incomplete
  });
});