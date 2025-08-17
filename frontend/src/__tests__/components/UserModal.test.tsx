import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserModal from '../../components/users/UserModal';
import type { User, AddUserData, UpdateUserData } from '../../types/user';

vi.mock('../../services/roleService', () => ({
  getAllRoles: vi.fn().mockResolvedValue([{ name: 'User' }, { name: 'Admin' }, { name: 'Manager' }]),
}));

describe('UserModal', () => {
  const onClose = vi.fn();
  const onSave: (data: AddUserData | UpdateUserData, options: { userId?: number }) => Promise<void> = vi.fn(async () => {});
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <UserModal
        mode="add"
        isOpen={false}
        onClose={onClose}
        onSave={onSave}
      />
    );
    expect(screen.queryByText(/Add New User|Edit User/)).not.toBeInTheDocument();
  });

  it('renders add mode with dynamic role options and validates', async () => {
    render(
      <UserModal
        mode="add"
        isOpen
        onClose={onClose}
        onSave={onSave}
      />
    );

    await screen.findByLabelText(/Username/i);

    await user.click(screen.getByRole('button', { name: /Add User/i }));
    expect(await screen.findByRole('option', { name: 'Manager' })).toBeInTheDocument();
  });

  it('submits add user data correctly', async () => {
    render(
      <UserModal
        mode="add"
        isOpen
        onClose={onClose}
        onSave={onSave}
      />
    );

    await screen.findByLabelText(/Username/i);
    await user.type(screen.getByLabelText(/Username/i), 'johnny');
    await user.type(screen.getByLabelText(/Email Address/i), 'john@example.com');

    // select role (default is 'User' but we change it to Manager)
    await user.selectOptions(screen.getByLabelText(/Application Role/i), 'Manager');

    await user.type(screen.getByLabelText(/^Password$/i), 'P@ssw0rd!');
    await user.type(screen.getByLabelText(/Confirm Password/i), 'P@ssw0rd!');

    await user.click(screen.getByRole('button', { name: /Add User/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'johnny',
          email: 'john@example.com',
          password: 'P@ssw0rd!',
          role: 'Manager',
        }),
        {}
      );
    });
  });

  it('renders edit mode with read-only fields and saves role change', async () => {
    const existing: User = {
      id: 10,
      employeeNumber: 'E100',
      username: 'alice',
      name: 'Alice Doe',
      email: 'alice@example.com',
      terminationDate: null,
      employeeStatus: 'Active',
      role: 'User',
    };

    render(
      <UserModal
        mode="edit"
        isOpen
        onClose={onClose}
        onSave={onSave}
        user={existing}
      />
    );

    await screen.findByText('Alice Doe');
    expect(screen.getByText('Edit User')).toBeInTheDocument();

    // change role
    await user.selectOptions(screen.getByLabelText(/Application Role/i), 'Admin');
    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        { role: 'Admin' },
        { userId: 10 }
      );
    });
  });

  it('closes on Cancel', async () => {
    render(
      <UserModal
        mode="add"
        isOpen
        onClose={onClose}
        onSave={onSave}
      />
    );

    await user.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
