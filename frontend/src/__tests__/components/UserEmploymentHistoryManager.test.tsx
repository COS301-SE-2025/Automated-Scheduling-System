import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserEmploymentHistoryManager from '../../components/users/UserEmploymentHistoryManager';
import type { EmploymentHistory } from '../../types/employmentHistory';
import type { JobPosition } from '../../services/jobPositionService';

vi.mock('../../services/employmentHistoryService', () => ({
  getEmploymentHistory: vi.fn(),
  createEmploymentHistory: vi.fn(),
  updateEmploymentHistory: vi.fn(),
  deleteEmploymentHistory: vi.fn(),
}));

import * as svc from '../../services/employmentHistoryService';
type MockFn = ReturnType<typeof vi.fn>;
const mocked = svc as unknown as {
  getEmploymentHistory: MockFn;
  createEmploymentHistory: MockFn;
  updateEmploymentHistory: MockFn;
  deleteEmploymentHistory: MockFn;
};

const positions: JobPosition[] = [
  { positionMatrixCode: 'DEV', jobTitle: 'Developer', isActive: true } as any,
  { positionMatrixCode: 'QA', jobTitle: 'QA Tester', isActive: true } as any,
];

const historyRows: EmploymentHistory[] = [
  { employmentID: 1, employeeNumber: 'E1', positionMatrixCode: 'DEV', startDate: '2025-01-01', endDate: null, employmentType: 'Primary', notes: 'Note' },
];

describe('UserEmploymentHistoryManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading then empty', async () => {
  mocked.getEmploymentHistory.mockResolvedValueOnce([]);
    render(<UserEmploymentHistoryManager employeeNumber="E1" jobPositions={positions} />);
    expect(screen.getByText(/Loading/)).toBeInTheDocument();
    await screen.findByText(/No employment history/);
  });

  it('renders history row and opens edit modal', async () => {
  mocked.getEmploymentHistory.mockResolvedValueOnce(historyRows);
    render(<UserEmploymentHistoryManager employeeNumber="E1" jobPositions={positions} />);
    await screen.findByText(/Developer/);
    fireEvent.click(screen.getByTitle('Edit'));
    await screen.findByText(/Edit Position: DEV/);
  });

  it('adds position via modal', async () => {
  mocked.getEmploymentHistory.mockResolvedValueOnce([]).mockResolvedValueOnce(historyRows);
  mocked.createEmploymentHistory.mockResolvedValueOnce({});
    render(<UserEmploymentHistoryManager employeeNumber="E1" jobPositions={positions} />);
    await screen.findByText(/No employment history/);
    fireEvent.click(screen.getByRole('button', { name: /Add/ }));
    await screen.findByText(/Add Current Positions/);
    // Select first row checkbox to ensure creation logic executes
    const firstCheckbox = screen.getByLabelText(/Select DEV/);
    fireEvent.click(firstCheckbox);
    fireEvent.click(screen.getByRole('button', { name: /Add Selected/ }));
    await waitFor(() => {
      expect(mocked.createEmploymentHistory).toHaveBeenCalledTimes(1);
      expect(mocked.getEmploymentHistory.mock.calls.length).toBeGreaterThanOrEqual(2); // initial + refresh
    });
  });

  it('delete employment record', async () => {
  mocked.getEmploymentHistory.mockResolvedValueOnce(historyRows);
    vi.spyOn(global, 'confirm').mockReturnValue(true);
  mocked.deleteEmploymentHistory.mockResolvedValueOnce({});
    render(<UserEmploymentHistoryManager employeeNumber="E1" jobPositions={positions} />);
    await screen.findByText(/Developer/);
    fireEvent.click(screen.getByTitle('Delete'));
    await waitFor(() => {
  expect(mocked.deleteEmploymentHistory).toHaveBeenCalled();
    });
  });

  it('shows error on load failure', async () => {
  // Ensure clean mock then force rejection
  mocked.getEmploymentHistory.mockReset();
  mocked.getEmploymentHistory.mockImplementation(() => Promise.reject(new Error('Err')));
    render(<UserEmploymentHistoryManager employeeNumber="E1" jobPositions={positions} />);
    await waitFor(() => {
      expect(mocked.getEmploymentHistory).toHaveBeenCalledTimes(1);
      const err = screen.queryByText(/Err/) || screen.queryByText(/Failed to load employment history/i);
      expect(err).toBeInTheDocument();
    });
  });
});
