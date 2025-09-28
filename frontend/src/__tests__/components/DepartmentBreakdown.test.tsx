import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DepartmentBreakdown from '../../components/visualization/DepartmentBreakdown';

// Mock recharts to simplify DOM and expose cell fill values
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="barchart">{children}</div>,
  CartesianGrid: () => <div data-testid="grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => null,
  Bar: ({ children }: any) => <div data-testid="bar-wrapper">{children}</div>,
  Cell: ({ fill }: any) => <div data-testid="bar-cell" data-fill={fill} />,
}));

type DeptItem = any; // loosen for test convenience

const sampleData: DeptItem[] = [
  { positionTitle: 'Engineering', positionCode: 'ENG', employeeCount: 10, requiredCount: 10, completedCount: 10, outstandingCount: 0, complianceRate: 100 }, // >=90
  { positionTitle: 'Sales', positionCode: 'SAL', employeeCount: 8, requiredCount: 8, completedCount: 6, outstandingCount: 2, complianceRate: 75 }, // >=70
  { positionTitle: 'Support', positionCode: 'SUP', employeeCount: 5, requiredCount: 5, completedCount: 3, outstandingCount: 2, complianceRate: 55 }, // >=50
  { positionTitle: 'HR', positionCode: 'HR', employeeCount: 4, requiredCount: 4, completedCount: 1, outstandingCount: 3, complianceRate: 25 }, // <50
];

const baseFilter: any = { positionCodes: undefined };

describe('DepartmentBreakdown', () => {
  const onFilterChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no data', () => {
    render(<DepartmentBreakdown data={[]} onFilterChange={onFilterChange} currentFilters={baseFilter} />);
    expect(screen.getByText(/No department data available/i)).toBeInTheDocument();
  });

  it('renders chart cells with correct color dimming and table rows', () => {
    render(<DepartmentBreakdown data={sampleData} onFilterChange={onFilterChange} currentFilters={baseFilter} />);
  // Table rows (HR appears twice: title + code) so use getAllByText
  expect(screen.getByText('Engineering')).toBeInTheDocument();
  const hrTexts = screen.getAllByText('HR');
  expect(hrTexts.length).toBeGreaterThanOrEqual(2);
  // Ensure one of the HR occurrences is in a row containing compliance 25.0%
  const hrRow = hrTexts[0].closest('tr');
  expect(hrRow?.textContent).toMatch(/25\.0/);
    // Chart cells (4) and colors with 80 opacity suffix since none selected yet
    const cells = screen.getAllByTestId('bar-cell');
    expect(cells.length).toBe(sampleData.length);
    const fills = cells.map(c => c.getAttribute('data-fill'));
    expect(fills).toContain('#0078a680'); // 100% (>=90)
    expect(fills).toContain('#00bac880'); // 75% (>=70)
    expect(fills).toContain('#24396680'); // 55% (>=50)
    expect(fills).toContain('#EF444480'); // 25% (<50)
  });

  it('toggles selection and updates filters via onFilterChange', () => {
    render(<DepartmentBreakdown data={sampleData} onFilterChange={onFilterChange} currentFilters={baseFilter} />);
    const engRow = screen.getByText('Engineering').closest('tr')!;
    fireEvent.click(engRow);
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionCodes: ['ENG'] }));
    // Clear filters button visible
    expect(screen.getByText(/Clear filters \(1\)/)).toBeInTheDocument();
    // Click again to remove
    fireEvent.click(engRow);
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionCodes: undefined }));
    expect(screen.queryByText(/Clear filters/)).not.toBeInTheDocument();
  });

  it('selects multiple rows then clears with button', () => {
    render(<DepartmentBreakdown data={sampleData} onFilterChange={onFilterChange} currentFilters={baseFilter} />);
    const engRow = screen.getByText('Engineering').closest('tr')!;
    const salRow = screen.getByText('Sales').closest('tr')!;
    fireEvent.click(engRow);
    fireEvent.click(salRow);
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionCodes: ['ENG','SAL'] }));
    const clearBtn = screen.getByText(/Clear filters \(2\)/);
    fireEvent.click(clearBtn);
    expect(onFilterChange).toHaveBeenLastCalledWith(expect.objectContaining({ positionCodes: undefined }));
    expect(screen.queryByText(/Clear filters/)).not.toBeInTheDocument();
  });
});
