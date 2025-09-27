import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock child modals (ConfirmModal + GenericSelectModal)
vi.mock('../../components/ui/ConfirmModal', () => ({
  __esModule: true,
  default: ({ isOpen, title, message, onConfirm }: any) => isOpen ? (
    <div data-testid="confirm-modal">
      <h2>{title}</h2>
      <p>{message}</p>
      <button onClick={onConfirm}>OK</button>
    </div>
  ) : null
}));

const capturedSelectProps: any[] = [];
vi.mock('../../components/ui/GenericSelectModal', () => ({
  __esModule: true,
  default: (props: any) => {
    capturedSelectProps.push(props);
    if (!props.isOpen) return null;
    return (
      <div data-testid="select-modal">
        <h2>{props.title}</h2>
        <ul>
          {props.items.map((c: any) => <li key={c.competencyID}>{c.competencyName}</li>)}
        </ul>
        <button onClick={() => props.onConfirm(props.items.map((c: any) => String(c.competencyID)))}>Add Selected</button>
        <button onClick={props.onClose}>Close</button>
      </div>
    );
  }
}));

import AddPrerequisiteForm from '../../components/competency/AddPrerequisiteForm';

describe('AddPrerequisiteForm', () => {
  const baseCompetencies = [
    { competencyID: 1, competencyName: 'A', competencyTypeName: 'Type1' },
    { competencyID: 2, competencyName: 'B', competencyTypeName: 'Type2' },
    { competencyID: 3, competencyName: 'C', competencyTypeName: 'Type3' },
  ] as any[];

  it('shows info modal when no eligible options', () => {
    const onAdd = vi.fn();
    render(<AddPrerequisiteForm onAdd={onAdd} currentCompetencyID={1} allCompetencies={baseCompetencies.slice(0,1)} existingPrerequisiteIDs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Competencies/i }));
    expect(screen.getByTestId('confirm-modal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('OK'));
    expect(screen.queryByTestId('confirm-modal')).not.toBeInTheDocument();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('opens picker and adds selected prerequisites (skips duplicates & current)', () => {
    const onAdd = vi.fn();
    render(<AddPrerequisiteForm onAdd={onAdd} currentCompetencyID={1} allCompetencies={baseCompetencies} existingPrerequisiteIDs={[2]} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Competencies/i }));
    // Modal appears with items excluding current (1) and existingPrerequisiteIDs (2) => only C
    const modal = screen.getByTestId('select-modal');
    expect(modal).toBeInTheDocument();
    expect(screen.queryByText('A')).not.toBeInTheDocument();
    expect(screen.queryByText('B')).not.toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Add Selected/));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(3);
  });

  it('does nothing if confirm called with empty array', () => {
    const onAdd = vi.fn();
    render(<AddPrerequisiteForm onAdd={onAdd} currentCompetencyID={1} allCompetencies={baseCompetencies} existingPrerequisiteIDs={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /Select Competencies/i }));
    // manually invoke the captured props confirm with [] to simulate no selection
    const last = capturedSelectProps[capturedSelectProps.length - 1];
    last.onConfirm([]);
    expect(onAdd).not.toHaveBeenCalled();
  });
});
