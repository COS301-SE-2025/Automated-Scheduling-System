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

const mockUpdateEmployeeProfile = vi.fn().mockResolvedValue(undefined);

vi.mock("../../services/profileService", () => ({
  getEmployeeCompetencyProfile: (...args: any[]) => mockGetEmployeeCompetencyProfile(...args),
  updateEmployeeProfile: (...args: any[]) => mockUpdateEmployeeProfile(...args),
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

  // ---------------- Settings Tab Tests ----------------
  it("shows validation error when trying to save with both email and phone empty", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);

    // Ensure inputs are empty
  const emailInput = screen.getByPlaceholderText(/your.email@company.com/i) as HTMLInputElement;
  const phoneInput = screen.getByPlaceholderText(/27123456789 or 0123456789/i) as HTMLInputElement;
    expect(emailInput.value).toBe("");
    expect(phoneInput.value).toBe("");

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter at least an email address or phone number.')).toBeInTheDocument();
    });
  });

  it("shows validation error for invalid email format", async () => {
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);

  const emailInput = screen.getByPlaceholderText(/your.email@company.com/i) as HTMLInputElement;
    await user.type(emailInput, 'invalid-email');

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    });
  });

  it("saves profile successfully and shows success message", async () => {
    // Use a deferred promise to reliably observe the loading state before completion
    let resolveUpdate: (value: undefined) => void;
    mockUpdateEmployeeProfile.mockImplementationOnce(
      () => new Promise<undefined>((res) => { resolveUpdate = res; })
    );
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);

  const emailInput = screen.getByPlaceholderText(/your.email@company.com/i);
    await user.type(emailInput, 'user@example.com');

    const saveButton = screen.getByRole('button', { name: /Save Changes/i });
    await user.click(saveButton);

    // Wait until the button reflects loading (disabled) state
    await waitFor(() => {
      expect(saveButton).toBeDisabled();
    });

    // Resolve the deferred promise to simulate API completion
    resolveUpdate!(undefined);

    // Now expect success message and button re-enabled
    await waitFor(() => {
      expect(screen.getByText('Profile updated successfully!')).toBeInTheDocument();
      expect(saveButton).not.toBeDisabled();
    });
    expect(mockUpdateEmployeeProfile).toHaveBeenCalledWith({ email: 'user@example.com', phone: '' });
  });

  it("shows network error message on network failure", async () => {
    mockUpdateEmployeeProfile.mockRejectedValueOnce(new Error('network timeout'));
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);
  const emailInput = screen.getByPlaceholderText(/your.email@company.com/i);
    await user.type(emailInput, 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => {
      expect(screen.getByText('Network error. Please check your connection and try again.')).toBeInTheDocument();
    });
  });

  it("shows not implemented message when API returns 404", async () => {
    mockUpdateEmployeeProfile.mockRejectedValueOnce(new Error('Request failed with status 404'));
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);
    const phoneInput = screen.getByPlaceholderText(/27123456789 or 0123456789/i);
    await user.type(phoneInput, '0123456789');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => {
      expect(screen.getByText('Profile update endpoint not implemented yet. Contact your system administrator.')).toBeInTheDocument();
    });
  });

  it("shows generic failure message for other errors", async () => {
    mockUpdateEmployeeProfile.mockRejectedValueOnce(new Error('Boom'));
    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );
    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);
    const emailInput = screen.getByPlaceholderText(/your.email@company.com/i);
    await user.type(emailInput, 'user@example.com');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));
    await waitFor(() => {
      expect(screen.getByText(/Failed to update profile: Boom/)).toBeInTheDocument();
    });
  });

  it("cancel resets form values to original prefilled values", async () => {
    mockGetEmployeeCompetencyProfile.mockResolvedValueOnce({
      employee: {
        employeeNumber: 'EMP999',
        name: 'Prefilled User',
        positionCode: 'DEV777',
        positionTitle: 'Engineer',
        email: 'prefilled@example.com',
        phone: '+123456'
      },
      completed: [],
      required: []
    });

    render(
      <MemoryRouter>
        <EmployeeProfilePage />
      </MemoryRouter>
    );

    const settingsTab = await screen.findByText("Settings");
    await user.click(settingsTab);

  const emailInput = await screen.findByPlaceholderText(/your.email@company.com/i) as HTMLInputElement;
  const phoneInput = screen.getByPlaceholderText(/27123456789 or 0123456789/i) as HTMLInputElement;
    expect(emailInput.value).toBe('prefilled@example.com');
    expect(phoneInput.value).toBe('+123456');

    // Change values
    await user.clear(emailInput);
    await user.type(emailInput, 'changed@example.com');
    await user.clear(phoneInput);
    await user.type(phoneInput, '+654321');
    expect(emailInput.value).toBe('changed@example.com');
    expect(phoneInput.value).toBe('+654321');

    await user.click(screen.getByRole('button', { name: /Cancel/i }));

    // Reverted
    expect(emailInput.value).toBe('prefilled@example.com');
    expect(phoneInput.value).toBe('+123456');
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
      const expectedAchievement = new Date('2024-01-15').toLocaleDateString();
      const expectedExpiry1 = new Date('2025-01-15').toLocaleDateString();
      const expectedExpiry2 = new Date('2024-01-01').toLocaleDateString();
      expect(screen.getByText(expectedAchievement)).toBeInTheDocument();
      expect(screen.getByText(expectedExpiry1)).toBeInTheDocument();
      expect(screen.getByText(expectedExpiry2)).toBeInTheDocument();
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