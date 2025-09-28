import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the backend service used by canvasBackend
vi.mock('../../services/ruleService', () => ({
  listRuleRecords: vi.fn(),
  createRule: vi.fn(),
  updateRule: vi.fn(),
  deleteRule: vi.fn(),
}));

import {
  exportSingleRuleV2WithUI,
  saveRuleToBackend,
  deleteRuleInBackend,
  materializeFromRecords,
  materializeFromBackend,
} from '../../utils/canvasBackend';

import * as RuleService from '../../services/ruleService';

describe('canvasBackend utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportSingleRuleV2WithUI', () => {
    it('builds RuleV2 + _ui for a rule subgraph', () => {
      const nodes: any[] = [
        { id: 'r1', type: 'rule', position: { x: 100, y: 50 }, data: { label: 'Rule', name: 'My Rule' } },
        {
          id: 't1',
          type: 'trigger',
          position: { x: 120, y: 50 },
          data: {
            triggerType: 'onEvent',
            parameters: [
              { key: 'topic', value: 'order.created' },
              { key: '', value: 'ignored' }, // blank keys are dropped
            ],
          },
        },
        {
          id: 'c1',
          type: 'conditions',
          position: { x: 80, y: 80 },
          data: {
            conditions: [
              { fact: 'amount', operator: 'greaterThan', value: '100' },
              { fact: 'isVip', operator: 'isTrue', value: 'shouldBeDropped' }, // value omitted for isTrue/isFalse
            ],
          },
        },
        {
          id: 'a1',
          type: 'actions',
          position: { x: 140, y: 80 },
          data: {
            actions: [
              {
                type: 'email',
                parameters: [{ key: 'to', value: 'ops@example.com' }],
              },
            ],
          },
        },
        // unrelated node not connected to r1
        { id: 'x1', type: 'rule', position: { x: 0, y: 0 }, data: { label: 'Other', name: 'Other' } },
      ];

      const edges: any[] = [
        { id: 'e1', source: 'r1', target: 't1' },
        { id: 'e2', source: 'r1', target: 'c1' },
        { id: 'e3', source: 'r1', target: 'a1' },
      ];

      const spec = exportSingleRuleV2WithUI(nodes, edges, 'r1');

      expect(spec.name).toBe('My Rule');

      expect(spec.trigger).toEqual({
        type: 'onEvent',
        parameters: { topic: 'order.created' },
      });

      // Coalesce optional arrays for TS safety
      const conditions = spec.conditions ?? [];
      const actions = spec.actions ?? [];

      expect(conditions[0]).toEqual({
        fact: 'amount',
        operator: 'greaterThan',
        value: '100',
      });
      expect(conditions[1]).toMatchObject({
        fact: 'isVip',
        operator: 'isTrue',
      });
      expect((conditions[1] as any).value).toBeUndefined();

      expect(actions[0]).toEqual({
        type: 'email',
        parameters: { to: 'ops@example.com' },
      });

      // _ui contains rule + connected children only
      expect(Object.keys(spec._ui.nodes).sort()).toEqual(['a1', 'c1', 'r1', 't1'].sort());
      expect(spec._ui.nodes['r1']).toMatchObject({ type: 'rule', position: { x: 100, y: 50 } });
      expect(spec._ui.edges).toEqual([
        { id: 'e1', source: 'r1', target: 't1' },
        { id: 'e2', source: 'r1', target: 'c1' },
        { id: 'e3', source: 'r1', target: 'a1' },
      ]);
    });

    it('throws if the rule node is not found', () => {
      expect(() => exportSingleRuleV2WithUI([], [], 'missing')).toThrowError('Rule node not found');
    });
  });

  describe('saveRuleToBackend', () => {
    it('updates when a numeric backendId is provided', async () => {
      const nodes: any[] = [{ id: 'r1', type: 'rule', position: { x: 0, y: 0 }, data: { name: 'R1' } }];
      const edges: any[] = [];
      (RuleService.updateRule as any).mockResolvedValue(undefined);

      const id = await saveRuleToBackend(nodes, edges, 'r1', 42);

      expect(RuleService.updateRule).toHaveBeenCalledWith('42', expect.any(Object));
      expect(id).toBe(42);
      expect(nodes[0].data.backendId).toBe(42);
      expect(nodes[0].data.saved).toBe(true);
    });

    it('updates when a non-empty string backendId is provided', async () => {
      const nodes: any[] = [{ id: 'r1', type: 'rule', position: { x: 0, y: 0 }, data: { name: 'R1' } }];
      const edges: any[] = [];
      (RuleService.updateRule as any).mockResolvedValue(undefined);

      const id = await saveRuleToBackend(nodes, edges, 'r1', 'rule_7');

      expect(RuleService.updateRule).toHaveBeenCalledWith('rule_7', expect.any(Object));
      expect(id).toBe('rule_7');
      expect(nodes[0].data.backendId).toBe('rule_7');
      expect(nodes[0].data.saved).toBe(true);
    });

    it('looks up existing record by _ui and updates if found', async () => {
      const nodes: any[] = [{ id: 'r1', type: 'rule', position: { x: 0, y: 0 }, data: { name: 'R1' } }];
      const edges: any[] = [];
      (RuleService.listRuleRecords as any).mockResolvedValue([
        {
          id: 55,
          name: 'Existing',
          spec: { _ui: { nodes: { r1: { type: 'rule', position: { x: 0, y: 0 } } }, edges: [] } },
        },
      ]);
      (RuleService.updateRule as any).mockResolvedValue(undefined);

      const id = await saveRuleToBackend(nodes, edges, 'r1');

      expect(RuleService.listRuleRecords).toHaveBeenCalled();
      expect(RuleService.updateRule).toHaveBeenCalledWith('55', expect.any(Object));
      expect(id).toBe(55);
      expect(nodes[0].data.backendId).toBe(55);
      expect(nodes[0].data.saved).toBe(true);
    });

    it('creates when no existing record is found', async () => {
      const nodes: any[] = [{ id: 'r1', type: 'rule', position: { x: 0, y: 0 }, data: { name: 'R1' } }];
      const edges: any[] = [];
      (RuleService.listRuleRecords as any).mockResolvedValue([]);
      (RuleService.createRule as any).mockResolvedValue({ id: 77 });

      const id = await saveRuleToBackend(nodes, edges, 'r1');

      expect(RuleService.createRule).toHaveBeenCalledWith(expect.any(Object));
      expect(id).toBe(77);
      expect(nodes[0].data.backendId).toBe(77);
      expect(nodes[0].data.saved).toBe(true);
    });

    it('creates when lookup fails', async () => {
      const nodes: any[] = [{ id: 'r1', type: 'rule', position: { x: 0, y: 0 }, data: { name: 'R1' } }];
      const edges: any[] = [];
      (RuleService.listRuleRecords as any).mockRejectedValue(new Error('network'));
      (RuleService.createRule as any).mockResolvedValue({ id: 88 });

      const id = await saveRuleToBackend(nodes, edges, 'r1');

      expect(RuleService.createRule).toHaveBeenCalled();
      expect(id).toBe(88);
      expect(nodes[0].data.backendId).toBe(88);
      expect(nodes[0].data.saved).toBe(true);
    });
  });

  describe('deleteRuleInBackend', () => {
    it('no-ops for invalid ids', async () => {
      await deleteRuleInBackend(undefined as any);
      await deleteRuleInBackend('');
      await deleteRuleInBackend('   ');

      expect(RuleService.deleteRule).not.toHaveBeenCalled();
    });

    it('deletes for valid ids (string and number, including 0)', async () => {
      await deleteRuleInBackend('abc');
      await deleteRuleInBackend(0);
      await deleteRuleInBackend(123);

      expect(RuleService.deleteRule).toHaveBeenCalledWith('abc');
      expect(RuleService.deleteRule).toHaveBeenCalledWith('0');
      expect(RuleService.deleteRule).toHaveBeenCalledWith('123');
      expect((RuleService.deleteRule as any).mock.calls.length).toBe(3);
    });
  });

  describe('materializeFromRecords', () => {
    it('builds canvas nodes and edges from backend records', () => {
      const records: any[] = [
        {
          id: 1,
          name: 'Rule A',
          spec: {
            trigger: { type: 'onEvent', parameters: { k1: 'v1' } },
            conditions: [{ fact: 'x', operator: 'equals', value: '10' }],
            actions: [{ type: 'notify', parameters: { to: 'ops' } }],
            _ui: {
              nodes: {
                r1: { type: 'rule', position: { x: 10, y: 20 } },
                t1: { type: 'trigger', position: { x: 15, y: 25 } },
                a1: { type: 'actions', position: { x: 30, y: 40 } },
              },
              edges: [
                { id: 'e1', source: 'r1', target: 't1' },
                { id: 'e2', source: 'r1', target: 'a1' },
              ],
            },
          },
        },
        {
          id: 2,
          name: 'Rule B',
          spec: {
            _ui: {
              nodes: {
                c1: { type: 'conditions', position: { x: 50, y: 60 } },
                r1: { type: 'rule', position: { x: 10, y: 20 } }, // duplicate, should be ignored
              },
              edges: [{ id: 'e2', source: 'r1', target: 'a1' }], // duplicate edge
            },
          },
        },
        // record without _ui should be ignored safely
        { id: 3, name: 'No UI', spec: {} },
      ];

      const { nodes, edges } = materializeFromRecords(records);

      // 4 unique nodes: r1, t1, a1, c1
      const ids = nodes.map((n: any) => n.id).sort();
      expect(ids).toEqual(['a1', 'c1', 'r1', 't1'].sort());

      const rule = nodes.find((n: any) => n.id === 'r1')!;
      expect(rule.type).toBe('rule');
      expect(rule.data).toMatchObject({ label: 'Rule A', name: 'Rule A', saved: true, backendId: 1 });

      const trig = nodes.find((n: any) => n.id === 't1')!;
      expect(trig.data).toMatchObject({ label: 'Trigger', triggerType: 'onEvent' });
      expect(trig.data.parameters).toEqual([{ key: 'k1', value: 'v1' }]);

      const acts = nodes.find((n: any) => n.id === 'a1')!;
      expect(acts.data.actions[0]).toEqual({ type: 'notify', parameters: [{ key: 'to', value: 'ops' }] });

      // edges de-duplicated
      expect(edges).toEqual([
        { id: 'e1', source: 'r1', target: 't1' },
        { id: 'e2', source: 'r1', target: 'a1' },
      ]);
    });
  });

  describe('materializeFromBackend', () => {
    it('delegates to listRuleRecords and returns materialized canvas', async () => {
      const records: any[] = [
        {
          id: 1,
          name: 'Rule A',
          spec: {
            _ui: {
              nodes: { r1: { type: 'rule', position: { x: 0, y: 0 } } },
              edges: [],
            },
          },
        },
      ];
      (RuleService.listRuleRecords as any).mockResolvedValue(records);

      const result = await materializeFromBackend();

      expect(RuleService.listRuleRecords).toHaveBeenCalled();
      expect(result.nodes.map((n: any) => n.id)).toEqual(['r1']);
      expect(result.edges).toEqual([]);
    });
  });
});