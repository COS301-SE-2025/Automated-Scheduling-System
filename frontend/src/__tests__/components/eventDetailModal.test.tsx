import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventClickArg } from '@fullcalendar/core';
import EventDetailModal, { type EventDetailModalProps } from '../../components/ui/EventDetailModal';

const formatDisplayDateTime = (date: Date | null): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString(undefined, {
        year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
};

describe('EventDetailModal', () => {
    const mockOnClose = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    const createMockEvent = (overrides: Partial<EventClickArg['event']> & { extendedProps?: any }): EventClickArg['event'] => {
        const baseEvent = {
            id: 'test-event-1',
            title: 'Default Event Title',
            start: new Date(),
            end: new Date(),
            allDay: false,
            extendedProps: {
                scheduleId: 1,
                definitionId: 101,
                eventType: 'Default Type',
                roomName: 'Default Room',
                maxAttendees: 10,
                minAttendees: 1,
                statusName: 'Scheduled',
                creationDate: new Date().toISOString(),
                facilitator: 'Default Facilitator',
                color: '#3788d8',
            }
        };

        const finalExtendedProps = 'extendedProps' in overrides 
            ? overrides.extendedProps 
            : baseEvent.extendedProps;

        const finalEvent = { ...baseEvent, ...overrides };
        finalEvent.extendedProps = finalExtendedProps;

        return finalEvent as unknown as EventClickArg['event'];
    };

    const defaultEvent = createMockEvent({
        title: 'Sample Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
    });

    const defaultProps: EventDetailModalProps = {
        isOpen: true,
        onClose: mockOnClose,
        event: defaultEvent,
        onEdit: mockOnEdit,
        onDelete: mockOnDelete,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should not render if isOpen is false', () => {
        render(<EventDetailModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Event Details')).not.toBeInTheDocument();
    });

    it('should not render if event is null', () => {
        render(<EventDetailModal {...defaultProps} event={null} />);
        expect(screen.queryByText('Event Details')).not.toBeInTheDocument();
    });

    it('should render all event details correctly', () => {
        const eventData = createMockEvent({
            title: 'Team Sync',
            start: new Date('2024-07-30T14:00:00Z'),
            end: new Date('2024-07-30T15:00:00Z'),
            extendedProps: {
                eventType: 'Weekly Meeting',
                roomName: 'Conference Room A',
                statusName: 'Confirmed',
                maxAttendees: 25,
                minAttendees: 5,
                creationDate: '2024-07-01T10:00:00Z'
            },
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('Event Details')).toBeInTheDocument();
        
        const checkDetailItem = (label: string, value: string | number) => {
            const labelElement = screen.getByText(label);
            expect(labelElement).toBeInTheDocument();
            expect(labelElement.nextElementSibling).toHaveTextContent(String(value));
        };

        checkDetailItem('Title', 'Team Sync');
        checkDetailItem('Event Type', 'Weekly Meeting');
        checkDetailItem('Start', formatDisplayDateTime(eventData.start));
        checkDetailItem('End', formatDisplayDateTime(eventData.end));
        checkDetailItem('Location', 'Conference Room A');
        checkDetailItem('Status', 'Confirmed');
        checkDetailItem('Max Attendees', 25);
        checkDetailItem('Min Attendees', 5);
        checkDetailItem('Created On', formatDisplayDateTime(new Date('2024-07-01T10:00:00Z')));
    });

    it('should display N/A for missing extendedProps values', () => {
        const eventData = createMockEvent({
            title: 'Ad-hoc Discussion',
            start: new Date('2024-07-30T16:00:00Z'),
            end: new Date('2024-07-30T16:30:00Z'),
            extendedProps: {},
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('Ad-hoc Discussion')).toBeInTheDocument();

        const checkNA = (label: string) => {
             const labelElement = screen.getByText(label);
             expect(labelElement.nextElementSibling).toHaveTextContent('N/A');
        };

        checkNA('Event Type');
        checkNA('Location');
        checkNA('Status');
        checkNA('Max Attendees');
        checkNA('Min Attendees');
        // checkNA('Created On');
    });

    it('should call onClose when Close button is clicked', () => {
        render(<EventDetailModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Close/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onEdit when Edit button is clicked', () => {
        render(<EventDetailModal {...defaultProps} event={defaultEvent} />);
        fireEvent.click(screen.getByRole('button', { name: /Edit/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(defaultEvent);
    });

    it('should call onDelete when Delete button is clicked', () => {
        render(<EventDetailModal {...defaultProps} event={defaultEvent} />);
        fireEvent.click(screen.getByRole('button', { name: /Delete/i }));
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(defaultEvent);
    });
});