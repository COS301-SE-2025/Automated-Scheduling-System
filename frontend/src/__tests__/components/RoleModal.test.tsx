import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RoleModal from '../../components/roles/RoleModal';
import type { AllowedPage, RoleRecord, AddRoleData } from '../../types/role';

const allPages: { value: AllowedPage; label: string }[] = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'users', label: 'Users' },
  { value: 'roles', label: 'Roles' },
  { value: 'calendar', label: 'Calendar' },
  { value: 'event-definitions', label: 'Event Definitions' },
  { value: 'events', label: 'Events' },
  { value: 'rules', label: 'Rules' },
  { value: 'competencies', label: 'Competencies' },
  { value: 'main-help', label: 'Main Help' },
];

describe('RoleModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => {});
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed', () => {
    render(
      <RoleModal
        isOpen={false}
        mode="add"
        onClose={onClose}
        onSave={onSave as unknown as (d: AddRoleData) => Promise<void>}
        role={null}
        allPages={allPages}
      />
    );
    expect(screen.queryByText(/Add New Role|Edit Role|View Role/)).not.toBeInTheDocument();
  });

  it('renders add mode with empty fields and validates name', async () => {
    render(
      <RoleModal
        isOpen
        mode="add"
        onClose={onClose}
        onSave={onSave as unknown as (d: AddRoleData) => Promise<void>}
        role={null}
        allPages={allPages}
      />
    );

    await screen.findByLabelText(/Role Name/i);

    await user.click(screen.getByRole('button', { name: /Create Role/i }));

    // Only name is validated in component via register
    expect(await screen.findByText(/Name is required/i)).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('submits add role with selected permissions', async () => {
    render(
      <RoleModal
        isOpen
        mode="add"
        onClose={onClose}
        onSave={onSave as unknown as (d: AddRoleData) => Promise<void>}
        role={null}
        allPages={allPages}
      />
    );

    await screen.findByLabelText(/Role Name/i);
    await user.type(screen.getByLabelText(/Role Name/i), 'Editor');

    // pick two permissions
    const usersPerm = screen.getByRole('checkbox', { name: /Users/i });
    const calendarPerm = screen.getByRole('checkbox', { name: /Calendar/i });
    await user.click(usersPerm);
    await user.click(calendarPerm);

    await user.click(screen.getByRole('button', { name: /Create Role/i }));

    // onSave called with data
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Editor', permissions: expect.arrayContaining(['users', 'calendar']) })
    );
  });

  it('renders edit mode with prefilled data and saves changes', async () => {
    const role: RoleRecord = { id: 1, name: 'Admin', description: 'all', permissions: ['dashboard', 'roles'] };

    render(
      <RoleModal
        isOpen
        mode="edit"
        onClose={onClose}
        onSave={onSave as unknown as (d: AddRoleData) => Promise<void>}
        role={role}
        allPages={allPages}
      />
    );

    await screen.findByDisplayValue('Admin');
    expect(screen.getByText('Edit Role')).toBeInTheDocument();

    const rolesCheckbox = screen.getByRole('checkbox', { name: /Roles/i }) as HTMLInputElement;
    expect(rolesCheckbox).toBeChecked();
    expect(rolesCheckbox).toBeDisabled();

    const usersPerm = screen.getByRole('checkbox', { name: /Users/i });
    await user.click(usersPerm);

    await user.click(screen.getByRole('button', { name: /Save Changes/i }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Admin', permissions: expect.arrayContaining(['roles', 'users']) })
    );
  });

  it('view mode disables inputs and hides submit button', async () => {
    const role: RoleRecord = { id: 2, name: 'Viewer', description: '', permissions: ['dashboard'] };

    render(
      <RoleModal
        isOpen
        mode="view"
        onClose={onClose}
        onSave={onSave as unknown as (d: AddRoleData) => Promise<void>}
        role={role}
        allPages={allPages}
      />
    );

    await screen.findByDisplayValue('Viewer');
    expect(screen.getByText('View Role')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Role|Save Changes/i })).not.toBeInTheDocument();
  });
});
