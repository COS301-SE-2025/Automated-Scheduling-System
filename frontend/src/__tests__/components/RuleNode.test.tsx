import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

let rfNodes: any[] = [];
let rfEdges: any[] = [];
const setNodes = vi.fn((updater: any) => { rfNodes = typeof updater === 'function' ? updater(rfNodes) : updater; });

// Track dispatched custom events
const dispatched: { type: string; detail: any }[] = [];
const origDispatch = window.dispatchEvent;
window.dispatchEvent = (evt: Event) => { if ((evt as any).type?.startsWith('rule:')) { dispatched.push({ type: (evt as any).type, detail: (evt as CustomEvent).detail }); } return origDispatch.call(window, evt); };

vi.mock('reactflow', () => ({
  Handle: (p: any) => <div data-handle data-type={p.type} />,
  Position: { Top: 'top', Bottom: 'bottom' },
  useReactFlow: () => ({
    setNodes,
    getNodes: () => rfNodes,
    getEdges: () => rfEdges,
    getNode: (id: string) => rfNodes.find(n => n.id === id),
  }),
  useStore: (sel: any) => sel({ nodeInternals: new Map(rfNodes.map(n => [n.id, n])), edges: rfEdges }),
}));

const triggerMeta = { type: 'tA', parameters: [ { name: 'tflag', type: 'boolean', required: true }, { name: 'tnum', type: 'number' }, { name: 'tmode', type: 'string', options: ['X','Y'] } ] };
const actionMeta = { type: 'aA', parameters: [ { name: 'acount', type: 'number', required: true }, { name: 'amode', type: 'string', options: ['ONE','TWO'] } ] };

vi.mock('../../utils/canvasBackend', () => ({
  saveRuleToBackend: vi.fn(async () => 'backend-123'),
}));
import { saveRuleToBackend } from '../../utils/canvasBackend';

vi.mock('../../contexts/RulesMetadataContext', () => ({
  useRulesMetadata: () => ({
    byTrigger: new Map([[triggerMeta.type, triggerMeta]]),
    byAction: new Map([[actionMeta.type, actionMeta]]),
  }),
}));

import RuleNode from '../../components/rules-canvas/RuleNode';

const baseRule = (dataOverride: any = {}) => {
  rfNodes = [
    { id: 'rule1', type: 'rule', data: { label: 'Rule 1', name: 'Rule 1', saved: false, ...dataOverride } },
  ];
  rfEdges = [];
};

const addNeighbor = (id: string, type: string, data: any) => {
  rfNodes.push({ id, type, data });
  rfEdges.push({ id: `${id}-edge`, source: 'rule1', target: id });
};

const renderRule = () => render(
  <RuleNode id="rule1" type="rule" data={rfNodes[0].data} xPos={0} yPos={0} selected={false} dragging={false} zIndex={0} isConnectable dragHandle={undefined as any} />
);

describe('RuleNode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dispatched.length = 0;
  });

  it('disables save when incomplete and shows alert on attempt', () => {
    baseRule();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderRule();
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect(saveBtn).toBeDisabled();
    fireEvent.click(saveBtn);
    // disabled prevents click handler; ensure no alert
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('alerts when no name provided', () => {
    baseRule({ name: '' });
    addNeighbor('tr1','trigger',{ triggerType: 'tA', parameters: [{ key: 'tflag', value: 'true' }] });
    addNeighbor('cond1','conditions',{ conditions: [] });
    addNeighbor('act1','actions',{ actions: [] });
    renderRule();
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    expect(saveBtn).not.toBeDisabled();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(saveBtn);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/provide a name/i));
  });

  it('validates trigger + action parameters and aggregates errors', () => {
    baseRule({ name: 'My Rule' });
    addNeighbor('tr1','trigger',{ triggerType: 'tA', parameters: [ { key: 'tflag', value: '' }, { key: 'tnum', value: 'abc' }, { key: 'tmode', value: 'Z' } ] });
    addNeighbor('cond1','conditions',{ conditions: [] });
    addNeighbor('act1','actions',{ actions: [ { type: 'aA', parameters: [ { key: 'acount', value: '' }, { key: 'amode', value: 'THREE' } ] } ] });
    renderRule();
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    fireEvent.click(saveBtn);
    expect(alertSpy).toHaveBeenCalled();
    const msg = (alertSpy.mock.calls[0][0] as string);
    expect(msg).toMatch(/Trigger parameter 'tflag' is required/);
    expect(msg).toMatch(/must be a number/);
    expect(msg).toMatch(/must be one of/);
    expect(msg).toMatch(/Action\[1\] parameter 'acount' is required/);
  });

  it('saves successfully and dispatches rule:saved', async () => {
    baseRule({ name: 'Good Rule' });
    addNeighbor('tr1','trigger',{ triggerType: 'tA', parameters: [ { key: 'tflag', value: 'true' } ] });
    addNeighbor('cond1','conditions',{ conditions: [] });
    addNeighbor('act1','actions',{ actions: [ { type: 'aA', parameters: [ { key: 'acount', value: '5' } ] } ] });
    renderRule();
    const saveBtn = screen.getByRole('button', { name: /Save/i });
    fireEvent.click(saveBtn);
    await waitFor(() => {
      expect(saveRuleToBackend).toHaveBeenCalled();
      expect(dispatched.find(d => d.type === 'rule:saved')).toBeTruthy();
    });
    // Because our mocked useStore does not trigger a re-render, the DOM button may not reflect disabled state.
    // Instead verify that setNodes updated the underlying node data to saved: true.
    expect(rfNodes.find(n => n.id === 'rule1')?.data.saved).toBe(true);
  });

  it('handles backend save failure', async () => {
    (saveRuleToBackend as any).mockRejectedValueOnce(new Error('fail')); // force failure
    baseRule({ name: 'Bad Rule' });
    addNeighbor('tr1','trigger',{ triggerType: 'tA', parameters: [ { key: 'tflag', value: 'true' } ] });
    addNeighbor('cond1','conditions',{ conditions: [] });
    addNeighbor('act1','actions',{ actions: [ { type: 'aA', parameters: [ { key: 'acount', value: '5' } ] } ] });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderRule();
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));
    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed to save rule/i));
    });
  });

  it('dispatches delete confirm event', () => {
    baseRule({ name: 'Del Rule' });
    renderRule();
    fireEvent.click(screen.getByLabelText(/Delete rule/i));
    expect(dispatched.find(d => d.type === 'rule:confirm-delete' && d.detail.name === 'Del Rule')).toBeTruthy();
  });
});
