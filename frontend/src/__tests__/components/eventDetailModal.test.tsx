import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventClickArg } from '@fullcalendar/core';
import EventDetailModal, { type EventDetailModalProps } from '../../components/ui/EventDetailModal'; 

const formatTestDateTime = (date: Date | null, isAllDay: boolean, isEnd: boolean = false): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    if (isAllDay) {
        if (isEnd) {
            d.setDate(d.getDate() - 1);
        }
        return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return d.toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

describe('EventDetailModal', () => {
    const mockOnClose = vi.fn();

    const createMockEvent = (overrides: Partial<EventClickArg['event']>): EventClickArg['event'] => {
        const baseEvent = {
            title: 'Default Event Title',
            start: new Date(),
            end: new Date(),
            allDay: false,
            extendedProps: {}
        };
        return { ...baseEvent, ...overrides } as unknown as EventClickArg['event'];
    };

    const defaultEvent = createMockEvent({
        title: 'Sample Event',
        start: new Date('2024-01-01T10:00:00Z'),
        end: new Date('2024-01-01T11:00:00Z'),
        allDay: false,
    });

    const defaultProps: EventDetailModalProps = {
        isOpen: true,
        onClose: mockOnClose,
        event: defaultEvent,
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

    it('should render event details for a non-all-day event', () => {
        const eventData = createMockEvent({
            title: 'Team Sync',
            start: new Date('2024-07-30T14:00:00Z'),
            end: new Date('2024-07-30T15:00:00Z'),
            allDay: false,
            extendedProps: {
                eventType: 'Meeting',
                relevantParties: 'HR',
            },
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('Event Details')).toBeInTheDocument();
        expect(screen.getByText('Team Sync')).toBeInTheDocument();
        expect(screen.getByText(formatTestDateTime(eventData.start, false))).toBeInTheDocument();
        expect(screen.getByText(formatTestDateTime(eventData.end, false))).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
        expect(screen.getByText('Meeting')).toBeInTheDocument();
        expect(screen.getByText('HR')).toBeInTheDocument();
    });
    
    it('should display N/A for missing extendedProps values', () => {
        const eventData = createMockEvent({
            title: 'Ad-hoc Discussion',
            start: new Date('2024-07-30T16:00:00Z'),
            end: new Date('2024-07-30T16:30:00Z'),
            allDay: false,
            extendedProps: {}, 
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('Ad-hoc Discussion')).toBeInTheDocument();
        
        const eventTypeElement = screen.getByText('Event Type').nextElementSibling;
        expect(eventTypeElement).toHaveTextContent('N/A');

        const relevantPartiesElement = screen.getByText('Relevant Parties').nextElementSibling;
        expect(relevantPartiesElement).toHaveTextContent('N/A');
    });

    it('should display N/A for null start or end dates', () => {
        const eventData = createMockEvent({
            title: 'Undefined Event',
            start: null,
            end: null,
            allDay: false,
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('Undefined Event')).toBeInTheDocument();
        
        const startDateElement = screen.getByText('Start').nextElementSibling;
        expect(startDateElement).toHaveTextContent('N/A');

        const endDateElement = screen.getByText('End').nextElementSibling;
        expect(endDateElement).toHaveTextContent('N/A');
    });

    it('should handle null end date for an all-day event', () => {
        const eventData = createMockEvent({
            title: 'All Day Event (No End Date)',
            start: new Date('2024-09-01T00:00:00Z'),
            end: null,
            allDay: true,
            extendedProps: { eventType: 'Misc', relevantParties: 'Some people' }
        });
        render(<EventDetailModal {...defaultProps} event={eventData} />);

        expect(screen.getByText('All Day Event (No End Date)')).toBeInTheDocument();
        expect(screen.getByText(formatTestDateTime(eventData.start, true))).toBeInTheDocument();
        
        const endDateElement = screen.getByText('End').nextElementSibling;
        expect(endDateElement).toHaveTextContent('N/A');
        
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('Misc')).toBeInTheDocument();
        expect(screen.getByText('Some people')).toBeInTheDocument();
    });

    it('should call onClose when Close button is clicked', () => {
        render(<EventDetailModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Close/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});