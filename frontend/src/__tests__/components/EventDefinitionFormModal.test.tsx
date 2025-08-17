import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EventDefinitionFormModal from '../../components/ui/EventDefinitionFormModal';
import type { EventDefinitionFormModalProps } from '../../components/ui/EventDefinitionFormModal';

describe('EventDefinitionFormModal', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();
  const user = userEvent.setup();

  const defaultProps: EventDefinitionFormModalProps = {
    isOpen: true,
    onClose: mockOnClose,
    onSave: mockOnSave,
  } as unknown as EventDefinitionFormModalProps;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if isOpen is false', () => {
    render(<EventDefinitionFormModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Add New Event Definition')).not.toBeInTheDocument();
    expect(screen.queryByText('Edit Event Definition')).not.toBeInTheDocument();
  });

  it('should render with default fields in create mode', async () => {
    render(<EventDefinitionFormModal {...defaultProps} />);
    await screen.findByLabelText(/Event Name/i);
    expect(screen.getByText('Add New Event Definition')).toBeInTheDocument();
    expect(screen.getByLabelText(/Event Name/i)).toHaveValue('');
    expect(screen.getByLabelText(/Standard Duration/i)).toHaveValue('');
  });

  it('should display validation errors for required fields', async () => {
    render(<EventDefinitionFormModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: /Save Definition/i }));

    expect(await screen.findByText('Event name is required')).toBeInTheDocument();
    expect(await screen.findByText('Standard duration is required (e.g., 2 hours)')).toBeInTheDocument();
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  
  it('should populate fields from initialData in edit mode and submit', async () => {
    const initialData = {
      CustomEventID: 10,
      EventName: 'Onboarding',
      ActivityDescription: 'New hire onboarding',
      StandardDuration: '1 day',
      Facilitator: 'HR',
      CreatedBy: 'admin',
      CreationDate: '2024-03-01T00:00:00.000Z',
      GrantsCertificateID: 5,
    } as any;

    render(<EventDefinitionFormModal {...defaultProps} initialData={initialData} />);

    await screen.findByDisplayValue('Onboarding');
    expect(screen.getByText('Edit Event Definition')).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Standard Duration/i));
    await user.type(screen.getByLabelText(/Standard Duration/i), '8 hours');
    await user.click(screen.getByRole('button', { name: /Save Definition/i }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith({
        EventName: 'Onboarding',
        ActivityDescription: 'New hire onboarding',
        StandardDuration: '8 hours',
        Facilitator: 'HR',
        GrantsCertificateID: 5,
      });
    });
  });

  it('should call onClose when Cancel is clicked', async () => {
    render(<EventDefinitionFormModal {...defaultProps} />);
    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
