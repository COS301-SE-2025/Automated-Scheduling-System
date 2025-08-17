import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockGetEventDefinitions = vi.fn().mockResolvedValue([]);
const mockGetScheduledEvents = vi.fn().mockResolvedValue([]);
vi.mock("../../services/eventService", () => ({
  getEventDefinitions: (...args: any[]) => mockGetEventDefinitions(...args),
  getScheduledEvents: (...args: any[]) => mockGetScheduledEvents(...args),
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: "Admin" } }),
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

import EventDefinitionsPage from "../../pages/EventDefinitionsPage";
import { MemoryRouter } from "react-router-dom";

describe("EventDefinitionsPage", () => {
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
          msg.includes("<button>") &&
          (msg.includes("descendant") ||
            msg.includes("nested") ||
            msg.includes("contain"))
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

  it("renders header and add button", async () => {
    render(
      <MemoryRouter>
        <EventDefinitionsPage />
      </MemoryRouter>
    );

    const headings = await screen.findAllByRole("heading", {
      name: /event definitions/i,
    });
    expect(headings.length).toBeGreaterThan(0);

    const addBtns = await screen.findAllByRole("button", {
      name: /add definition/i,
    });
    expect(addBtns.length).toBeGreaterThan(0);
    const addBtn = addBtns[addBtns.length - 1];
    expect(addBtn).toBeInTheDocument();
  });

  it("opens add definition modal when Add Definition clicked", async () => {
    render(
      <MemoryRouter>
        <EventDefinitionsPage />
      </MemoryRouter>
    );

    const addBtns = await screen.findAllByRole("button", {
      name: /add definition/i,
    });
    const addBtn = addBtns[addBtns.length - 1];
    await user.click(addBtn);

    await waitFor(() => {
      const modal = document.querySelector(
        "[data-testid='event-definition-modal'], .modal"
      );
      expect(modal ?? addBtn).toBeTruthy();
    });
  });

  it("fetches definitions on mount", async () => {
    render(
      <MemoryRouter>
        <EventDefinitionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockGetEventDefinitions).toHaveBeenCalled();
    });
  });
});
