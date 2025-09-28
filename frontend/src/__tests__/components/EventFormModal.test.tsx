import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { EventFormModalProps } from "../../components/ui/EventFormModal";

const _styleDesc = Object.getOwnPropertyDescriptor(
  HTMLStyleElement.prototype,
  "textContent"
);

Object.defineProperty(HTMLStyleElement.prototype, "textContent", {
  set() {},
  get() {
    return _styleDesc && _styleDesc.get ? _styleDesc.get.call(this) : "";
  },
  configurable: true,
});

vi.mock("../../services/api", () => {
  return {
    __esModule: true,
    default: async () => [],
  };
});

import EventFormModal from "../../components/ui/EventFormModal";
import type { EventDefinition } from "../../services/eventService";

const mockEventDefinitions: EventDefinition[] = [
  {
    CustomEventID: 1,
    EventName: "Team Meeting",
    ActivityDescription: "Weekly team sync",
    StandardDuration: "60",
    Facilitator: "Alice",
    CreatedBy: "admin",
    CreationDate: "2024-01-01T10:00:00.000Z",
  },
  {
    CustomEventID: 2,
    EventName: "Onboarding",
    ActivityDescription: "New employee onboarding",
    StandardDuration: "120",
    Facilitator: "Bob",
    CreatedBy: "admin",
    CreationDate: "2024-01-02T10:00:00.000Z",
  },
];

describe("EventFormModal", () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const mockOnNeedDefinition = vi.fn();
  const user = userEvent.setup();

  const defaultProps: EventFormModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
    eventDefinitions: mockEventDefinitions,
    onNeedDefinition: mockOnNeedDefinition,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not render if isOpen is false", () => {
    render(<EventFormModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText("Schedule New Event")).not.toBeInTheDocument();
  });

  it('should show "Action Required" message if no event definitions are available', async () => {
    render(<EventFormModal {...defaultProps} eventDefinitions={[]} />);

    expect(await screen.findByText("Action Required")).toBeInTheDocument();
    expect(
      await screen.findByText(
        "To schedule an event, you must first create an event type (a template for events)."
      )
    ).toBeInTheDocument();
  });

  it('should call onNeedDefinition when "Create New Event Type" is clicked', async () => {
    render(<EventFormModal {...defaultProps} eventDefinitions={[]} />);
    const createButton = screen.getByRole("button", {
      name: /Create New Event Type/i,
    });
    await user.click(createButton);
    expect(mockOnNeedDefinition).toHaveBeenCalledTimes(1);
  });

  it("should render with default fields in create mode", async () => {
    render(<EventFormModal {...defaultProps} />);
    await screen.findByLabelText(/Event Title/i);
    expect(screen.getByText("Schedule New Event")).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Title/i)).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /Select Event Type/i })
    ).toBeInTheDocument();
    expect(screen.getByText("None selected")).toBeInTheDocument();
    expect(screen.getByLabelText(/Min Attendees/i)).toHaveValue(0);
    expect(screen.getByLabelText(/Max Attendees/i)).toHaveValue(0);
  });

  it("should populate fields from initialData in edit mode", async () => {
    const initialData = {
      id: "evt-123",
      title: "My Test Event",
      startStr: "2025-10-15T10:00:00.000Z",
      endStr: "2025-10-15T11:00:00.000Z",
      customEventId: 2,
      color: "#ff0000",
    };
    render(<EventFormModal {...defaultProps} initialData={initialData} />);
    await screen.findByDisplayValue("My Test Event");
    expect(screen.getByText("Edit Scheduled Event")).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Title/i)).toHaveValue("My Test Event");

    expect(screen.getByText("Onboarding")).toBeInTheDocument();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    
    // Get the formatted datetime values for comparison
    const startDate = new Date("2025-10-15T10:00:00.000Z");
    const endDate = new Date("2025-10-15T11:00:00.000Z");
    const formatDateTimeLocal = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };
    
    expect(screen.getByLabelText(/Start Date & Time/i)).toHaveValue(formatDateTimeLocal(startDate));
    expect(screen.getByLabelText(/End Date & Time/i)).toHaveValue(formatDateTimeLocal(endDate));
  });

  it("should call onClose when Cancel button is clicked", async () => {
    render(<EventFormModal {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it("should display validation errors for required fields", async () => {
    render(<EventFormModal {...defaultProps} />);
    await user.click(screen.getByRole("button", { name: /Schedule Event/i }));

    expect(await screen.findByText("Title is required.")).toBeInTheDocument();

    expect(
      await screen.findByText(
        /You must select an event type\.|Expected number, received nan/i
      )
    ).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it("should call onSave with id when editing", async () => {
    const initialData = {
      id: "evt-123",
      title: "My Test Event",
      startStr: "2025-10-15T10:00:00.000Z",
      endStr: "2025-10-15T11:00:00.000Z",
      customEventId: 2,
      color: "#ff0000",
    };
    render(<EventFormModal {...defaultProps} initialData={initialData} />);

    await screen.findByDisplayValue("My Test Event");
    await user.clear(screen.getByLabelText(/Event Title/i));
    await user.type(
      screen.getByLabelText(/Event Title/i),
      "Updated Event Title"
    );
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "evt-123",
          title: "Updated Event Title",
          customEventId: 2,
        })
      );
    });
  });
});
