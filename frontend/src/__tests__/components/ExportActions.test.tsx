import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ExportActions from '../../components/visualization/ExportActions';

// Mock papaparse (hoisted)
vi.mock('papaparse', () => ({
  unparse: vi.fn((data: any) => JSON.stringify(data)),
}));

// jsPDF inline mock to avoid hoisting reference errors
const pdfSaveSpy = vi.fn();
const pdfCtorSpy = vi.fn();
vi.mock('jspdf', () => ({
  default: class {
    internal: any;
    setFontSize = vi.fn();
    text = vi.fn();
    addPage = vi.fn();
    save = pdfSaveSpy;
    constructor() {
      this.internal = { pageSize: { getHeight: () => 297 } };
      pdfCtorSpy();
    }
  }
}));

// Helpers to spy on DOM link creation
const clickSpy = vi.fn();

// Provide minimal dataset
const data: any = {
  companyOverview: {
    totalEmployees: 10,
    totalCompetencies: 5,
    totalRequired: 30,
    totalCompleted: 20,
    overallComplianceRate: 66.6,
  },
  departmentBreakdown: [
    { positionTitle: 'Engineering', positionCode: 'ENG', employeeCount: 5, requiredCount: 15, completedCount: 12, outstandingCount: 3, complianceRate: 80 },
  ],
  competencyHotspots: [
    { competencyName: 'First Aid', competencyTypeName: 'Safety', totalRequired: 10, totalCompleted: 6, incompleteCount: 4, incompleteRate: 40 },
  ],
};

describe('ExportActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Polyfill createObjectURL if missing (jsdom sometimes omits)
    if (!(global as any).URL.createObjectURL) {
      (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
    } else {
      (global as any).URL.createObjectURL = vi.fn(() => 'blob:mock');
    }
    vi.spyOn(document.body, 'appendChild');
    vi.spyOn(document.body, 'removeChild');
  });

  it('opens menu and performs CSV export', async () => {
    render(<ExportActions data={data} />);
    const toggle = screen.getByRole('button', { name: /Export Data/i });
    fireEvent.click(toggle);
    const csvBtn = screen.getByRole('button', { name: /Export as CSV/i });

    // Intercept anchor creation
    const origCreate = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate.call(document, tag) as any;
      if (tag === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    fireEvent.click(csvBtn);
    await waitFor(() => {
      // two CSV exports -> two clicks
      expect(clickSpy).toHaveBeenCalledTimes(2);
    });
  });

  it('opens menu and performs PDF export', async () => {
    render(<ExportActions data={data} />);
    fireEvent.click(screen.getByRole('button', { name: /Export Data/i }));
    fireEvent.click(screen.getByRole('button', { name: /Export as PDF/i }));
    await waitFor(() => {
      expect(pdfCtorSpy).toHaveBeenCalled();
      expect(pdfSaveSpy).toHaveBeenCalled();
    });
  });
});
