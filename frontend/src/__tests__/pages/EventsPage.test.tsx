import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetScheduledEvents = vi.fn();
const mockGetEventDefinitions = vi.fn();
const mockCreateEventDefinition = vi.fn();
const mockCreateScheduledEvent = vi.fn();
const mockUpdateScheduledEvent = vi.fn();

vi.mock("../../services/eventService", () => ({
  getScheduledEvents: (...args: any[]) => mockGetScheduledEvents(...args),
  getEventDefinitions: (...args: any[]) => mockGetEventDefinitions(...args),
  createEventDefinition: (...args: any[]) => mockCreateEventDefinition(...args),
  createScheduledEvent: (...args: any[]) => mockCreateScheduledEvent(...args),
  updateScheduledEvent: (...args: any[]) => mockUpdateScheduledEvent(...args),
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

vi.mock("../../hooks/useAuth", () => ({
  useAuth: () => ({ user: { role: 'Admin' }, permissions: ['event-definitions'] }),
}));

vi.mock("../../components/ui/EventDefinitionFormModal", () => ({
  default: (props: any) =>
    props.isOpen ? (
      <div data-testid="event-definition-modal">
        <button
          onClick={() => props.onSave?.({ EventName: "X", StandardDuration: "1h" })}
        >
          save-def
        </button>
        <button onClick={() => props.onClose?.()}>close-def</button>
      </div>
    ) : null,
}));

vi.mock("../../components/ui/EventFormModal", () => ({
  __esModule: true,
  default: (props: any) =>
    props.isOpen ? (
      <div data-testid="event-form-modal">
        <button
          onClick={() =>
            props.onSave?.({
              id: undefined,
              title: "Created",
              customEventId: 1,
              start: "2025-12-01T09:00",
              end: "2025-12-01T10:00",
              roomName: "",
              maximumAttendees: 0,
              minimumAttendees: 0,
              statusName: "Scheduled",
            })
          }
        >
          save-event
        </button>
        <button onClick={() => props.onClose?.()}>close-event</button>
      </div>
    ) : null,
}));

vi.mock("../../components/ui/EventDeleteConfirmationModal", () => ({ default: () => null }));
vi.mock("../../components/ui/EventDetailModal", () => ({ default: () => null }));

import EventsPage from "../../pages/EventsPage";
import { MemoryRouter } from "react-router-dom";

describe("EventsPage", () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();

    mockGetScheduledEvents.mockResolvedValue([
      {
        id: "1",
        title: "Alpha",
        start: "2025-01-01T09:00:00.000Z",
        end: "2025-01-01T10:00:00.000Z",
        allDay: false,
        extendedProps: {
          scheduleId: 1,
          definitionId: 1,
          eventType: "AlphaType",
          roomName: "Room A",
          maxAttendees: 10,
          minAttendees: 1,
          statusName: "Scheduled",
          creationDate: new Date().toISOString(),
          facilitator: "Alice",
          relevantParties: "All",
        },
      },
    ]);
    mockGetEventDefinitions.mockResolvedValue([]);
    mockCreateEventDefinition.mockResolvedValue({});
    mockCreateScheduledEvent.mockResolvedValue({});
    mockUpdateScheduledEvent.mockResolvedValue({});
  });

  it("renders header and admin actions and fetches data", async () => {
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

  expect(screen.getByText("All Company Events")).toBeInTheDocument();
  expect(await screen.findByText("Create New Event Types")).toBeInTheDocument();
  expect(await screen.findByText("Schedule Event")).toBeInTheDocument();

    await waitFor(() => expect(mockGetScheduledEvents).toHaveBeenCalled());
  });

  it("opens definition modal and saves a new definition", async () => {
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

  await user.click(await screen.findByText("Create New Event Types"));
    const modal = await screen.findByTestId("event-definition-modal");
    expect(modal).toBeInTheDocument();
    await user.click(screen.getByText("save-def"));

    await waitFor(() =>
      expect(mockCreateEventDefinition).toHaveBeenCalledWith({
        EventName: "X",
        StandardDuration: "1h",
      })
    );
    await waitFor(() => expect(mockGetScheduledEvents).toHaveBeenCalled());
  });

  it("opens event modal and saves a new scheduled event", async () => {
    render(
      <MemoryRouter>
        <EventsPage />
      </MemoryRouter>
    );

    await user.click(screen.getByText("Schedule Event"));
    const modal = await screen.findByTestId("event-form-modal");
    expect(modal).toBeInTheDocument();
    await user.click(screen.getByText("save-event"));
    await waitFor(() => expect(mockCreateScheduledEvent).toHaveBeenCalled());
    await waitFor(() => expect(mockGetScheduledEvents).toHaveBeenCalled());
  });
});
