import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserTable from '../../components/users/UserTable';
import type { User } from '../../types/user';
import type { Competency } from '../../types/competency';
import type { JobPosition } from '../../services/jobPositionService';

vi.mock('../../components/users/UserCompetencyManager', () => ({ default: () => <div data-testid="competency-manager">Competency Manager</div> }));
vi.mock('../../components/users/UserEmploymentHistoryManager', () => ({ default: () => <div data-testid="employment-manager">Employment Manager</div> }));

describe('UserTable', () => {
  const users: User[] = [{ id: 1, employeeNumber: 'E1', username: 'u1', name: 'User One', email: 'u1@example.com', terminationDate: null, employeeStatus: 'Active', role: 'Admin' }];
  const competencies: Competency[] = [] as any;
  const positions: JobPosition[] = [] as any;

  const onEdit = vi.fn();
  const onDelete = vi.fn();
  const onTogglePanel = vi.fn();

  beforeEach(() => { vi.clearAllMocks(); });

  it('shows loading spinner', () => {
    render(<UserTable users={[]} isLoading onEdit={onEdit} onDelete={onDelete} allCompetencies={competencies} jobPositions={positions} expandedUserPanel={null} onTogglePanel={onTogglePanel} />);
    // Spinner div has no accessible role; assert by class fallback
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeTruthy();
  });

  it('shows empty state', () => {
    render(<UserTable users={[]} isLoading={false} onEdit={onEdit} onDelete={onDelete} allCompetencies={competencies} jobPositions={positions} expandedUserPanel={null} onTogglePanel={onTogglePanel} />);
    expect(screen.getByText(/No users found/)).toBeInTheDocument();
  });

  it('renders user row and toggles panels', () => {
    const { rerender } = render(<UserTable users={users} isLoading={false} onEdit={onEdit} onDelete={onDelete} allCompetencies={competencies} jobPositions={positions} expandedUserPanel={null} onTogglePanel={onTogglePanel} />);
    expect(screen.getByText('User One')).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole('button', { name: /View/i })[0]);
    expect(onTogglePanel).toHaveBeenCalledWith(1, 'competencies');

    rerender(<UserTable users={users} isLoading={false} onEdit={onEdit} onDelete={onDelete} allCompetencies={competencies} jobPositions={positions} expandedUserPanel={{ userId: 1, panel: 'competencies' }} onTogglePanel={onTogglePanel} />);
    expect(screen.getByTestId('competency-manager')).toBeInTheDocument();
  });

  it('calls onEdit', () => {
    render(<UserTable users={users} isLoading={false} onEdit={onEdit} onDelete={onDelete} allCompetencies={competencies} jobPositions={positions} expandedUserPanel={null} onTogglePanel={onTogglePanel} />);
    fireEvent.click(screen.getByTitle('Edit User'));
    expect(onEdit).toHaveBeenCalled();
  });
});
