import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock the profile service
const mockGetEmployeeCompetencyProfile = vi.fn().mockResolvedValue({
  employee: {
    employeeNumber: "EMP001",
    name: "John Doe",
    positionCode: "DEV001",
    positionTitle: "Software Developer",
  },
  completed: [
    {
      competencyID: 1,
      competencyName: "JavaScript Fundamentals",
      competencyTypeName: "Technical",
      description: "Basic JavaScript knowledge",
      isActive: true,
      achievementDate: "2024-01-15",
      expiryDate: "2025-01-15",
      status: "Valid",
    },
    {
      competencyID: 2,
      competencyName: "Safety Training",
      competencyTypeName: "Mandatory",
      description: "Workplace safety training",
      isActive: true,
      achievementDate: "2023-12-01",
      expiryDate: "2024-01-01",
      status: "Expired",
    },
    {
      competencyID: 3,
      competencyName: "First Aid",
      competencyTypeName: "Mandatory",
      description: "Basic first aid training",
      isActive: true,
      achievementDate: "2024-10-01",
      expiryDate: "2024-12-01",
      status: "Expires Soon",
    },
  ],
  required: [
    {
      competencyID: 4,
      competencyName: "React Advanced",
      competencyTypeName: "Technical",
      description: "Advanced React concepts",
      isActive: true,
      prerequisites: [1],
    },
    {
      competencyID: 5,
      competencyName: "Team Leadership",
      competencyTypeName: "Soft Skills",
      description: "Leadership and management skills",
      isActive: true,
    },
  ],
});

vi.mock("../../services/profileService", () => ({
  getEmployeeCompetencyProfile: (...args: any[]) => mockGetEmployeeCompetencyProfile(...args),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { role: "User" },
    permissions: [],
  }),
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

import EmployeeProfilePage from "../../pages/EmployeeProfilePage";
import { MemoryRouter } from "react-router-dom";

describe("EmployeeProfilePage", () => {
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

  it("renders employee header information", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("John Doe")).toBeInTheDocument();
      expect(screen.getByText("Employee ID: EMP001")).toBeInTheDocument();
      expect(screen.getByText("Position: Software Developer (DEV001)")).toBeInTheDocument();
    });
  });

  it("shows loading state initially", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    expect(screen.getByText("Loading…")).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText("Loading…")).not.toBeInTheDocument();
    });
  });

  it("fetches employee profile data on mount", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetEmployeeCompetencyProfile).toHaveBeenCalled();
    });
  });

  it("renders tab navigation", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Completed Competencies")).toBeInTheDocument();
      expect(screen.getByText("Required Competencies")).toBeInTheDocument();
    });
  });

  it("displays completed competencies by default", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("JavaScript Fundamentals")).toBeInTheDocument();
      expect(screen.getByText("Safety Training")).toBeInTheDocument();
      expect(screen.getByText("First Aid")).toBeInTheDocument();
    });

    // Check table headers
    expect(screen.getByText("Competency")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Completion Date")).toBeInTheDocument();
    expect(screen.getByText("Expiry Date")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("displays competency statuses with correct styling", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      const validStatus = screen.getByText("Valid");
      const expiredStatus = screen.getByText("Expired");
      const expiresSoonStatus = screen.getByText("Expires Soon");

      expect(validStatus).toBeInTheDocument();
      expect(expiredStatus).toBeInTheDocument();
      expect(expiresSoonStatus).toBeInTheDocument();

      // Check CSS classes for styling
      expect(validStatus.closest('span')).toHaveClass('bg-green-100', 'text-green-700');
      expect(expiredStatus.closest('span')).toHaveClass('bg-red-100', 'text-red-700');
      expect(expiresSoonStatus.closest('span')).toHaveClass('bg-amber-100', 'text-amber-700');
    });
  });

  it("switches to required competencies tab", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    const requiredTab = await screen.findByText("Required Competencies");
    await user.click(requiredTab);

    await waitFor(() => {
      expect(screen.getByText("React Advanced")).toBeInTheDocument();
      expect(screen.getByText("Team Leadership")).toBeInTheDocument();
    });

    // Check for prerequisite information
    expect(screen.getByText(/Prerequisites:/)).toBeInTheDocument();
    expect(screen.getByText("JavaScript Fundamentals")).toBeInTheDocument();
  });

  it("displays message when no completed competencies", async () => {
    mockGetEmployeeCompetencyProfile.mockResolvedValueOnce({
      employee: {
        employeeNumber: "EMP002",
        name: "Jane Smith",
        positionCode: "NEW001",
        positionTitle: "New Employee",
      },
      completed: [],
      required: [
        {
          competencyID: 1,
          competencyName: "Orientation",
          competencyTypeName: "Mandatory",
          description: "Company orientation",
          isActive: true,
        },
      ],
    });

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("No completed competencies yet.")).toBeInTheDocument();
    });
  });

  it("displays message when no required competencies", async () => {
    mockGetEmployeeCompetencyProfile.mockResolvedValueOnce({
      employee: {
        employeeNumber: "EMP003",
        name: "Bob Johnson",
        positionCode: "ADM001",
        positionTitle: "Administrator",
      },
      completed: [
        {
          competencyID: 1,
          competencyName: "Admin Training",
          competencyTypeName: "Technical",
          description: "Administrative training",
          isActive: true,
          achievementDate: "2024-01-01",
          status: "Valid",
        },
      ],
      required: [],
    });

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    const requiredTab = await screen.findByText("Required Competencies");
    await user.click(requiredTab);

    await waitFor(() => {
      expect(screen.getByText("No required competencies at the moment.")).toBeInTheDocument();
    });
  });

  it("displays message when employee has no position assigned", async () => {
    mockGetEmployeeCompetencyProfile.mockResolvedValueOnce({
      employee: {
        employeeNumber: "EMP004",
        name: "Alice Brown",
        positionCode: "",
        positionTitle: "",
      },
      completed: [],
      required: [],
    });

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    const requiredTab = await screen.findByText("Required Competencies");
    await user.click(requiredTab);

    await waitFor(() => {
      expect(screen.getByText(/Your required competencies will appear here once you are assigned a job position/)).toBeInTheDocument();
    });
  });

  it("handles API errors gracefully", async () => {
    mockGetEmployeeCompetencyProfile.mockRejectedValueOnce(new Error("API Error"));

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Failed to load your competency profile")).toBeInTheDocument();
    });
  });

  it("formats dates correctly", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      // Check if dates are formatted properly
      expect(screen.getByText("1/15/2024")).toBeInTheDocument(); // achievementDate
      expect(screen.getByText("1/15/2025")).toBeInTheDocument(); // expiryDate
      expect(screen.getByText("1/1/2024")).toBeInTheDocument(); // expiry date
    });
  });

  it("handles competencies without expiry dates", async () => {
    mockGetEmployeeCompetencyProfile.mockResolvedValueOnce({
      employee: {
        employeeNumber: "EMP001",
        name: "John Doe",
        positionCode: "DEV001",
        positionTitle: "Software Developer",
      },
      completed: [
        {
          competencyID: 1,
          competencyName: "Permanent Skill",
          competencyTypeName: "Technical",
          description: "A skill that doesn't expire",
          isActive: true,
          achievementDate: "2024-01-15",
          expiryDate: null,
          status: "Valid",
        },
      ],
      required: [],
    });

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Permanent Skill")).toBeInTheDocument();
      expect(screen.getByText("N/A")).toBeInTheDocument(); // For no expiry date
    });
  });

  it("renders without crashing", () => {
    const { container } = render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    expect(container).toBeTruthy();
  });
});