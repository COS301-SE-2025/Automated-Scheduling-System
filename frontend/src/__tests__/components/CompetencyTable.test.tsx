import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('../../components/competency/JobLinkManager', () => ({
  __esModule: true,
  default: ({ competency, linkedRequirements }: any) => (
    <div data-testid="job-link-manager">Links for {competency.competencyName} ({linkedRequirements.length})</div>
  )
}));

import CompetencyTable from '../../components/competency/CompetencyTable';

const sampleCompetencies = [
  { competencyID: 1, competencyName: 'CPR', competencyTypeName: 'Safety', description: 'Desc A', isActive: true, expiryPeriodMonths: 12 },
  { competencyID: 2, competencyName: 'First Aid', competencyTypeName: 'Safety', description: 'Desc B', isActive: false, expiryPeriodMonths: null },
] as any[];

const jobRequirements = [
  { matrixID: 10, competencyID: 1, positionMatrixCode: 'DEV', status: 'Required' },
  { matrixID: 11, competencyID: 2, positionMatrixCode: 'QA', status: 'Optional' },
] as any[];

const positions = [ { positionMatrixCode: 'DEV', jobTitle: 'Developer' }, { positionMatrixCode: 'QA', jobTitle: 'QA Tester' } ] as any[];

describe('CompetencyTable', () => {
  it('shows loading spinner', () => {
    render(<CompetencyTable competencies={[]} isLoading onEdit={vi.fn()} onDelete={vi.fn()} onReactivate={vi.fn()} onViewPrerequisites={vi.fn()} expandedCompetencyId={null} onToggleExpand={vi.fn()} allJobPositions={positions} jobRequirements={jobRequirements} onAddJobLink={vi.fn()} onRemoveJobLink={vi.fn()} />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state', () => {
    render(<CompetencyTable competencies={[]} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} onReactivate={vi.fn()} onViewPrerequisites={vi.fn()} expandedCompetencyId={null} onToggleExpand={vi.fn()} allJobPositions={positions} jobRequirements={[]} onAddJobLink={vi.fn()} onRemoveJobLink={vi.fn()} />);
    expect(screen.getByText(/No competencies found/i)).toBeInTheDocument();
  });

  it('renders rows and triggers actions (edit, delete/reactivate, prerequisites, expand)', () => {
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onReactivate = vi.fn();
    const onViewPrereq = vi.fn();
    const onToggleExpand = vi.fn();

    render(<CompetencyTable competencies={sampleCompetencies} isLoading={false} onEdit={onEdit} onDelete={onDelete} onReactivate={onReactivate} onViewPrerequisites={onViewPrereq} expandedCompetencyId={null} onToggleExpand={onToggleExpand} allJobPositions={positions} jobRequirements={jobRequirements} onAddJobLink={vi.fn()} onRemoveJobLink={vi.fn()} />);

    // Both competency names shown
    expect(screen.getByText('CPR')).toBeInTheDocument();
    expect(screen.getByText('First Aid')).toBeInTheDocument();

    // Prerequisites button (ListTree icon) - two occurrences
    const prereqButtons = screen.getAllByTitle('View Prerequisites');
    fireEvent.click(prereqButtons[0]);
    expect(onViewPrereq).toHaveBeenCalledWith(expect.objectContaining({ competencyID: 1 }));

    // Expand job links (Users icon button) for first row
    const expandButtons = screen.getAllByTitle('View Job Matrix Links');
    fireEvent.click(expandButtons[0]);
    expect(onToggleExpand).toHaveBeenCalledWith(1);

    // Edit competency (Edit icon)
    const editButtons = screen.getAllByTitle('Edit Competency');
    fireEvent.click(editButtons[0]);
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ competencyID: 1 }));

    // Delete (active competency shows EyeOff)
    const deleteButtons = screen.getAllByTitle('Deactivate Competency');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ competencyID: 1 }));

    // Reactivate (inactive competency shows Undo2)
    const reactivateButtons = screen.getAllByTitle('Reactivate Competency');
    fireEvent.click(reactivateButtons[0]);
    expect(onReactivate).toHaveBeenCalledWith(expect.objectContaining({ competencyID: 2 }));
  });

  it('shows expanded job link manager when expandedCompetencyId set', () => {
    render(<CompetencyTable competencies={sampleCompetencies.slice(0,1)} isLoading={false} onEdit={vi.fn()} onDelete={vi.fn()} onReactivate={vi.fn()} onViewPrerequisites={vi.fn()} expandedCompetencyId={1} onToggleExpand={vi.fn()} allJobPositions={positions} jobRequirements={jobRequirements} onAddJobLink={vi.fn()} onRemoveJobLink={vi.fn()} />);
    expect(screen.getByTestId('job-link-manager')).toBeInTheDocument();
  });
});
