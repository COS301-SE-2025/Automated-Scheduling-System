import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks
// --- reactflow mock capturing setNodes mutations and exposing helpers
let rfNodes: any[] = [];
let rfEdges: any[] = [];
const deleteElements = vi.fn();
const setNodes = vi.fn((updater: any) => {
  rfNodes = typeof updater === 'function' ? updater(rfNodes) : updater;
});

vi.mock('reactflow', () => ({
  Handle: (props: any) => <div data-handle data-type={props.type} />,
  Position: { Top: 'top', Bottom: 'bottom' },
  useReactFlow: () => ({
    setNodes,
    getEdges: () => rfEdges,
    getNodes: () => rfNodes,
    getNode: (id: string) => rfNodes.find(n => n.id === id),
    deleteElements,
  }),
}));

// Rules metadata context mock
const actionsMeta = [
  {
    type: 'actAll',
    name: 'Act All',
    parameters: [
      { name: 'flag', type: 'boolean', required: true },
      { name: 'count', type: 'number' },
      { name: 'when', type: 'date' },
      { name: 'notes', type: 'text_area' },
      { name: 'emps', type: 'employees' },
      { name: 'evtype', type: 'event_type' },
      { name: 'positions', type: 'job_positions' },
      { name: 'mode', type: 'string', options: ['A', 'B'] },
      { name: 'misc', type: 'string' }, // default branch
    ],
  },
  {
    type: 'simple',
    name: 'Simple',
    parameters: [],
  },
];

vi.mock('../../components/rules-canvas/ActionsNode', async (orig) => {
  // not mocking component itself here, real import below
  return await orig();
});

vi.mock('../../contexts/RulesMetadataContext', () => ({
  useRulesMetadata: () => ({
    actions: actionsMeta,
    byAction: new Map(actionsMeta.map(a => [a.type, a])),
  }),
}));

import ActionsNode from '../../components/rules-canvas/ActionsNode';

// Utility to render with initial RF nodes
const renderActionsNode = (dataOverride: any = {}) => {
  rfNodes = [
    { id: 'r1', type: 'rule', data: { label: 'Rule 1', saved: true } },
    { id: 'actions1', type: 'actions', data: { label: 'Actions', actions: [], ...dataOverride } },
  ];
  rfEdges = [ { id: 'e1', source: 'r1', target: 'actions1' } ];
  return render(
    <ActionsNode
      id="actions1"
      type="actions"
      data={rfNodes[1].data}
      xPos={0}
      yPos={0}
      selected={false}
      dragging={false}
      zIndex={0}
      isConnectable
      dragHandle={undefined as any}
    />
  );
};


describe('ActionsNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pre-populated action parameters and triggers updates (setNodes calls) for various interactions', () => {
    // Pre-populate with full metadata parameters + one custom param to allow removal
    const initialParams = actionsMeta[0].parameters.map(p => ({ key: p.name, value: '' }));
    initialParams.push({ key: 'custom', value: '' });
    renderActionsNode({ actions: [{ type: 'actAll', parameters: initialParams }] });

    // Required first param cannot be removed
    const removeParamButtons = screen.getAllByRole('button', { name: /Remove parameter/i });
    expect(removeParamButtons[0]).toBeDisabled();

  const prevCalls = setNodes.mock.calls.length;
    // Boolean param select (first select with true/false options)
    const boolSelect = screen.getAllByRole('combobox').find(s => Array.from((s as HTMLSelectElement).options).some(o => o.value === 'true')) as HTMLSelectElement;
  fireEvent.change(boolSelect, { target: { value: 'true' } });
  expect(setNodes.mock.calls.length).toBeGreaterThan(prevCalls);

    // Number input
    const numberInput = screen.getAllByRole('textbox').find(i => (i as HTMLInputElement).getAttribute('pattern') === '[0-9]*') as HTMLInputElement;
  const prevCalls2 = setNodes.mock.calls.length;
  fireEvent.change(numberInput, { target: { value: '7' } });
  expect(setNodes.mock.calls.length).toBeGreaterThan(prevCalls2);

    // Text area
    const notesArea = screen.getByPlaceholderText(/Enter text/i) as HTMLTextAreaElement;
  const prevCalls3 = setNodes.mock.calls.length;
  fireEvent.change(notesArea, { target: { value: 'Note text' } });
  expect(setNodes.mock.calls.length).toBeGreaterThan(prevCalls3);

    // Add extra parameter
    const addParamBtn = document.querySelector('button[title="Add extra parameter"]') as HTMLButtonElement;
    fireEvent.click(addParamBtn);
    expect(setNodes).toHaveBeenLastCalledWith(expect.any(Function));

    // Remove custom parameter (last remove button)
    const removeButtons2 = screen.getAllByRole('button', { name: /Remove parameter/i });
    const lastRem = removeButtons2[removeButtons2.length - 1];
    fireEvent.click(lastRem);
    expect(setNodes).toHaveBeenCalled();

    // Remove action
    fireEvent.click(screen.getByRole('button', { name: /Remove action/i }));
    expect(setNodes).toHaveBeenCalled();

    // Delete whole block
    fireEvent.click(screen.getByLabelText(/Delete actions block/i));
    expect(deleteElements).toHaveBeenCalledWith({ nodes: [{ id: 'actions1' }] });
  });
});
