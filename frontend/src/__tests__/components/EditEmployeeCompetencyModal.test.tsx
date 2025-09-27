import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditEmployeeCompetencyModal from '../../components/users/EditEmployeeCompetencyModal';
import type { EmployeeCompetency } from '../../types/employeeCompetency';

const baseCompetency = (overrides: Partial<EmployeeCompetency> = {}): EmployeeCompetency => ({
  employeeCompetencyID: 1,
  employeeNumber: 'E1',
  competencyID: 10,
  achievementDate: '2025-01-15T00:00:00Z',
  expiryDate: '2026-01-15T00:00:00Z',
  notes: 'Initial',
  competencyDefinition: { competencyName: 'Safety' } as any,
  ...overrides,
});

describe('EditEmployeeCompetencyModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed or no competency', () => {
    const { rerender } = render(<EditEmployeeCompetencyModal isOpen={false} competency={null} onClose={onClose} onSave={onSave} />);
    expect(screen.queryByText(/Edit Competency/)).not.toBeInTheDocument();
    rerender(<EditEmployeeCompetencyModal isOpen={true} competency={null} onClose={onClose} onSave={onSave} />);
    expect(screen.queryByText(/Edit Competency/)).not.toBeInTheDocument();
  });

  it('renders and populates fields', () => {
    render(<EditEmployeeCompetencyModal isOpen competency={baseCompetency()} onClose={onClose} onSave={onSave} />);
    expect(screen.getByText(/Edit Competency: Safety/)).toBeInTheDocument();
    const ach = screen.getByLabelText(/Achievement Date/i) as HTMLInputElement;
    const exp = screen.getByLabelText(/Expiry Date/i) as HTMLInputElement;
    const notes = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement;
    expect(ach.value).toBe('2025-01-15');
    expect(exp.value).toBe('2026-01-15');
    expect(notes.value).toBe('Initial');
  });

  it('clears achievement and expiry via checkboxes', async () => {
    render(<EditEmployeeCompetencyModal isOpen competency={baseCompetency()} onClose={onClose} onSave={onSave} />);
    const achCheckbox = screen.getAllByRole('checkbox')[0];
    const expCheckbox = screen.getAllByRole('checkbox')[1];

    fireEvent.click(achCheckbox); // set to required
    fireEvent.click(expCheckbox); // clear expiry

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ achievementDate: null, expiryDate: null }));
    });
  });

  it('submits updated dates and notes', async () => {
    render(<EditEmployeeCompetencyModal isOpen competency={baseCompetency()} onClose={onClose} onSave={onSave} />);
    const ach = screen.getByLabelText(/Achievement Date/i) as HTMLInputElement;
    const exp = screen.getByLabelText(/Expiry Date/i) as HTMLInputElement;
    const notes = screen.getByLabelText(/Notes/i) as HTMLTextAreaElement;

    fireEvent.change(ach, { target: { value: '2025-02-01' } });
    fireEvent.change(exp, { target: { value: '2026-02-01' } });
    fireEvent.change(notes, { target: { value: 'Updated' } });

    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ achievementDate: '2025-02-01', expiryDate: '2026-02-01', notes: 'Updated' }));
    });
  });

  it('calls onClose', () => {
    render(<EditEmployeeCompetencyModal isOpen competency={baseCompetency()} onClose={onClose} onSave={onSave} />);
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows error', () => {
    render(<EditEmployeeCompetencyModal isOpen competency={baseCompetency()} onClose={onClose} onSave={onSave} error="Failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });
});
