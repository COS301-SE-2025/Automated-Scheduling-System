import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { EventFormModalProps } from '../../components/ui/EventFormModal';
import EventFormModal from '../../components/ui/EventFormModal';

describe('EventFormModal', () => {
    const mockOnClose = vi.fn();
    const mockOnSave = vi.fn();

    const defaultProps: EventFormModalProps = {
        isOpen: true,
        onClose: mockOnClose,
        onSave: mockOnSave,
    };

    beforeEach(() => 
    {
        vi.clearAllMocks();
    });

    it('should not render if isOpen is false', () => 
    {
        render(<EventFormModal {...defaultProps} isOpen={false} />);
        expect(screen.queryByText('Add New Event')).not.toBeInTheDocument();
    });

    it('should render with default fields when no initialData is provided', () => 
    {
        render(<EventFormModal {...defaultProps} />);
        expect(screen.getByLabelText(/Event Title/i)).toHaveValue('');
        expect(screen.getByLabelText(/All-day event/i)).toBeChecked();
        
    });

    it('should populate fields from initialData', () => {
        const initialData = {
            id: 'test-id',
            startStr: '2023-11-15T10:00',
            endStr: '2023-11-15T11:00',
            allDay: false,
            title: 'My Test Event',
            eventType: 'Training',
            relevantParties: 'Employees',
        };
        render(<EventFormModal {...defaultProps} initialData={initialData} />);
        expect(screen.getByLabelText(/Event Title/i)).toHaveValue('My Test Event');
        expect(screen.getByLabelText(/Date/i)).toHaveValue('2023-11-15');
        expect(screen.getByLabelText(/Start Time/i)).toHaveValue('10:00');
        expect(screen.getByText('Edit Event')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
    });

    it('should call onClose when Cancel button is clicked', () => {
        render(<EventFormModal {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('should call onSave with correct data when Save Event button is clicked', () => {
        render(<EventFormModal {...defaultProps} />);
        const titleInput = screen.getByLabelText(/Event Title/i);
        const dateInput = screen.getByLabelText(/Date/i);

        fireEvent.change(titleInput, { target: { value: 'New Meeting' } });
        fireEvent.change(dateInput, { target: { value: '2023-12-01' } });
        
        
        fireEvent.click(screen.getByRole('button', { name: /Save Event/i }));
        
        expect(mockOnSave).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'New Meeting',
                start: '2023-12-01', 
                end: '2023-12-01',   
                allDay: true,
                id: undefined,
            })
        );
    });

    it('should not call onSave if title is empty', () => {
        render(<EventFormModal {...defaultProps} />);
        
        fireEvent.click(screen.getByRole('button', { name: /Save Event/i }));
        expect(mockOnSave).not.toHaveBeenCalled();
    });

    it('should call onSave with id when editing', () => {
        const initialData = {
            id: '123',
            startStr: '2023-11-15T10:00',
            endStr: '2023-11-15T11:00',
            allDay: false,
            title: 'My Test Event',
            eventType: 'Training',
            relevantParties: 'Employees',
        };
        render(<EventFormModal {...defaultProps} initialData={initialData} />);
        fireEvent.click(screen.getByRole('button', { name: /Save Changes/i }));
        expect(mockOnSave).toHaveBeenCalledWith(
            expect.objectContaining({
                id: '123',
                title: 'My Test Event',
            })
        );
    });
});