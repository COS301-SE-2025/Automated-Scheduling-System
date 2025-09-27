import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import EditEmploymentHistoryModal from '../../components/users/EditEmploymentHistoryModal';
import type { EmploymentHistory } from '../../types/employmentHistory';

defaultDateMock();
function defaultDateMock() {
  // ensure stable date for closeNow checkbox logic
  const fixed = new Date('2025-03-10T12:00:00Z');
  vi.setSystemTime?.(fixed as any); // Vitest modern timers alternative if enabled
}

const baseRecord = (overrides: Partial<EmploymentHistory> = {}): EmploymentHistory => ({
  employmentID: 5,
  employeeNumber: 'E1',
  positionMatrixCode: 'POS1',
  startDate: '2025-01-01',
  endDate: null,
  employmentType: 'Primary',
  notes: 'Note',
  ...overrides,
});

describe('EditEmploymentHistoryModal', () => {
  const onClose = vi.fn();
  const onSave = vi.fn(async () => {});

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when closed or record null', () => {
    const { rerender } = render(<EditEmploymentHistoryModal isOpen={false} record={null} onClose={onClose} onSave={onSave} />);
    expect(screen.queryByText(/Edit Position/)).not.toBeInTheDocument();
    rerender(<EditEmploymentHistoryModal isOpen record={null} onClose={onClose} onSave={onSave} />);
    expect(screen.queryByText(/Edit Position/)).not.toBeInTheDocument();
  });

  it('renders current record (no end date) and allows closeNow', async () => {
    render(<EditEmploymentHistoryModal isOpen record={baseRecord()} onClose={onClose} onSave={onSave} />);
    expect(screen.getByText(/Edit Position: POS1/)).toBeInTheDocument();
    const endInput = screen.getByLabelText(/End Date/i) as HTMLInputElement;
    expect(endInput.value).toBe('');
    const cb = screen.getByRole('checkbox');
    fireEvent.click(cb);
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ endDate: expect.stringMatching(/^2025-03-10$/) }));
    });
  });

  it('renders past record and hides closeNow option', () => {
    render(<EditEmploymentHistoryModal isOpen record={baseRecord({ endDate: '2025-02-01' })} onClose={onClose} onSave={onSave} />);
    expect(screen.queryByText(/Set to today/)).not.toBeInTheDocument();
  });

  it('edits fields and saves', async () => {
    render(<EditEmploymentHistoryModal isOpen record={baseRecord()} onClose={onClose} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/Employment Type/i), { target: { value: 'Temp' } });
    fireEvent.change(screen.getByLabelText(/End Date/i), { target: { value: '2025-04-01' } });
    fireEvent.change(screen.getByLabelText(/Notes/i), { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/ }));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ employmentType: 'Temp', endDate: '2025-04-01', notes: 'Updated' }));
    });
  });

  it('shows error and allows cancel', () => {
    render(<EditEmploymentHistoryModal isOpen record={baseRecord()} onClose={onClose} onSave={onSave} error="ERR" />);
    expect(screen.getByText('ERR')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
