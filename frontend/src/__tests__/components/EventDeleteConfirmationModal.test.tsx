import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as eventService from '../../services/eventService';
import EventDeleteConfirmationModal from '../../components/ui/EventDeleteConfirmationModal';

describe('EventDeleteConfirmationModal', () => {
  const onClose = vi.fn();
  const onDeleteSuccess = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <EventDeleteConfirmationModal
        isOpen={false}
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={42}
        eventName="Sample Event"
      />
    );
    expect(screen.queryByText(/Delete Event/i)).not.toBeInTheDocument();
  });

  it('renders event deletion UI by default', () => {
    render(
      <EventDeleteConfirmationModal
        isOpen
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={42}
        eventName="Sample Event"
      />
    );

    expect(screen.getByText(/Delete Event/i)).toBeInTheDocument();
    expect(screen.getByText(/Sample Event/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Delete/i })).toBeInTheDocument();
  });

  it('calls deleteScheduledEvent on confirm for events', async () => {
    const spy = vi.spyOn(eventService, 'deleteScheduledEvent').mockResolvedValue();

    render(
      <EventDeleteConfirmationModal
        isOpen
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={99}
        eventName="Alpha"
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(spy).toHaveBeenCalledWith(99);
    expect(onDeleteSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls deleteEventDefinition on confirm for definitions', async () => {
    const spy = vi.spyOn(eventService, 'deleteEventDefinition').mockResolvedValue();

    render(
      <EventDeleteConfirmationModal
        isOpen
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={7}
        eventName="Beta"
        isDefinition
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(spy).toHaveBeenCalledWith(7);
    expect(onDeleteSuccess).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows error message if deletion fails', async () => {
    vi.spyOn(eventService, 'deleteScheduledEvent').mockRejectedValue(new Error('fail'));

    render(
      <EventDeleteConfirmationModal
        isOpen
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={123}
        eventName="Gamma"
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));

    expect(await screen.findByText(/Could not delete the event/i)).toBeInTheDocument();
    expect(onDeleteSuccess).not.toHaveBeenCalled();
    // Close should not be called on failure
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when Cancel clicked', async () => {
    render(
      <EventDeleteConfirmationModal
        isOpen
        onClose={onClose}
        onDeleteSuccess={onDeleteSuccess}
        eventId={1}
        eventName="Delta"
      />
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
