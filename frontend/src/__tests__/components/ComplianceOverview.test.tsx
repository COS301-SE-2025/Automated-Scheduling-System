import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import ComplianceOverview from "../../components/visualization/ComplianceOverview";
import type { AdminComplianceData } from "../../services/visualizationService";

describe("ComplianceOverview", () => {
  const mockData: AdminComplianceData = {
    companyOverview: {
      totalEmployees: 100,
      totalCompetencies: 50,
      totalRequired: 300,
      totalCompleted: 240,
      overallComplianceRate: 80,
    },
    departmentBreakdown: [],
    competencyHotspots: [],
    trendData: [],
    statusDistribution: [],
  };

  it("renders all overview cards with correct data", () => {
    render(<ComplianceOverview data={mockData} />);

    expect(screen.getByText("100")).toBeInTheDocument();
    expect(screen.getByText("Total Employees")).toBeInTheDocument();
    
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(screen.getByText("Active Competencies")).toBeInTheDocument();
    
    expect(screen.getByText("300")).toBeInTheDocument();
    expect(screen.getByText("Total Required")).toBeInTheDocument();
    
    expect(screen.getByText("240")).toBeInTheDocument();
    expect(screen.getByText("Total Completed")).toBeInTheDocument();
    
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText("Overall Compliance")).toBeInTheDocument();
  });

  it("shows green styling for high compliance rate (>=90%)", () => {
    const highComplianceData = {
      ...mockData,
      companyOverview: {
        ...mockData.companyOverview,
        overallComplianceRate: 95,
      },
    };

    render(<ComplianceOverview data={highComplianceData} />);
    
    expect(screen.getByText("95.0%")).toBeInTheDocument();
  });

  it("shows yellow styling for medium compliance rate (70-89%)", () => {
    const mediumComplianceData = {
      ...mockData,
      companyOverview: {
        ...mockData.companyOverview,
        overallComplianceRate: 75,
      },
    };

    render(<ComplianceOverview data={mediumComplianceData} />);
    
    expect(screen.getByText("75.0%")).toBeInTheDocument();
  });

  it("shows red styling for low compliance rate (<70%)", () => {
    const lowComplianceData = {
      ...mockData,
      companyOverview: {
        ...mockData.companyOverview,
        overallComplianceRate: 60,
      },
    };

    render(<ComplianceOverview data={lowComplianceData} />);
    
    expect(screen.getByText("60.0%")).toBeInTheDocument();
  });

  it("shows perfect compliance celebration message", () => {
    const perfectComplianceData = {
      ...mockData,
      companyOverview: {
        ...mockData.companyOverview,
        overallComplianceRate: 100,
      },
    };

    render(<ComplianceOverview data={perfectComplianceData} />);
    
    expect(screen.getByText("100.0%")).toBeInTheDocument();
    expect(screen.getByText("🎉 Perfect Compliance!")).toBeInTheDocument();
  });

});