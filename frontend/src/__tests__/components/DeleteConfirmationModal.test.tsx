import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DeleteConfirmationModal from '../../components/users/DeleteConfirmationModal';

describe('DeleteConfirmationModal (Users)', () => {
  const onClose = vi.fn();
  const onConfirm = vi.fn();
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <DeleteConfirmationModal
        isOpen={false}
        onClose={onClose}
        onConfirm={onConfirm}
        userName="John Doe"
      />
    );
    expect(screen.queryByText(/Delete User/i)).not.toBeInTheDocument();
  });

  it('renders and shows the username', () => {
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        userName="John Doe"
      />
    );

    expect(screen.getByText(/Delete User/i)).toBeInTheDocument();
    expect(screen.getByText(/John Doe/)).toBeInTheDocument();
  });

  it('invokes onConfirm and onClose via buttons', async () => {
    render(
      <DeleteConfirmationModal
        isOpen
        onClose={onClose}
        onConfirm={onConfirm}
        userName="Jane"
      />
    );

    await user.click(screen.getByRole('button', { name: /Delete/i }));
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
