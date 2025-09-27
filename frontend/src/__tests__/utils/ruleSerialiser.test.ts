// frontend/src/utils/ruleSerialiser.test.ts

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Edge, Node } from 'reactflow';
import {
    exportRuleRecordsWithUI,
    exportSingleRuleRecord,
    exportRulesJSON
} from '../../utils/ruleSerialiser';

// Mock data representing a React Flow canvas state with two distinct rules.
const MOCK_NODES: Node[] = [
    // Rule 1 components
    { id: 'rule-1', type: 'rule', position: { x: 100, y: 100 }, data: { name: 'High Temp Alert' } },
    { id: 'trigger-1', type: 'trigger', position: { x: 300, y: 50 }, data: { triggerType: 'deviceData', parameters: [{ key: 'deviceId', value: 'thermo-01' }] } },
    { id: 'cond-1', type: 'conditions', position: { x: 300, y: 150 }, data: { conditions: [
        { fact: 'temperature', operator: 'greaterThan', value: '30' },
        { fact: 'isSummer', operator: 'isTrue', value: '' } // value should be ignored for isTrue
    ] } },
    { id: 'act-1', type: 'actions', position: { x: 300, y: 250 }, data: { actions: [{ type: 'sendEmail', parameters: [{ key: 'to', value: 'admin@example.com' }, { key: '', value: 'ignored'}] }] } },

    // Rule 2 components
    { id: 'rule-2', type: 'rule', position: { x: 600, y: 100 }, data: { label: 'Low Stock Warning' } }, // uses label instead of name
    { id: 'trigger-2', type: 'trigger', position: { x: 800, y: 50 }, data: { triggerType: 'inventoryUpdate', parameters: [] } },
    { id: 'act-2', type: 'actions', position: { x: 800, y: 150 }, data: { actions: [{ type: 'createTicket', parameters: [{ key: 'priority', value: 'high' }] }] } },

    // An unconnected node that should be ignored
    { id: 'unconnected-1', type: 'trigger', position: { x: 100, y: 400 }, data: {} }
];

const MOCK_EDGES: Edge[] = [
    // Rule 1 edges
    { id: 'e-r1-t1', source: 'rule-1', target: 'trigger-1' },
    { id: 'e-r1-c1', source: 'rule-1', target: 'cond-1' },
    { id: 'e-r1-a1', source: 'rule-1', target: 'act-1' },

    // Rule 2 edges
    { id: 'e-r2-t2', source: 'rule-2', target: 'trigger-2' },
    { id: 'e-r2-a2', source: 'rule-2', target: 'act-2' },
];

describe('ruleSerialiser', () => {
    const mockDate = new Date('2023-10-27T10:00:00Z');

    beforeEach(() => {
        // Use fake timers to get consistent createdAt/updatedAt timestamps
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('exportRuleRecordsWithUI', () => {
        it('should return an empty array if no rule nodes are present', () => {
            const noRuleNodes = MOCK_NODES.filter(n => n.type !== 'rule');
            const result = exportRuleRecordsWithUI(noRuleNodes, MOCK_EDGES);
            expect(result).toEqual([]);
        });

        it('should serialize all rule nodes into records', () => {
            const result = exportRuleRecordsWithUI(MOCK_NODES, MOCK_EDGES);
            expect(result).toHaveLength(2);
        });

        it('should correctly serialize a complete rule with name', () => {
            const result = exportRuleRecordsWithUI(MOCK_NODES, MOCK_EDGES);
            const rule1Record = result.find(r => r.id === 'rule-1');

            expect(rule1Record).toBeDefined();
            expect(rule1Record).toEqual({
                id: 'rule-1',
                name: 'High Temp Alert',
                triggerType: 'deviceData',
                enabled: true,
                createdAt: mockDate.toISOString(),
                updatedAt: mockDate.toISOString(),
                spec: {
                    name: 'High Temp Alert',
                    trigger: {
                        type: 'deviceData',
                        parameters: { deviceId: 'thermo-01' }
                    },
                    conditions: [
                        { fact: 'temperature', operator: 'greaterThan', value: '30' },
                        { fact: 'isSummer', operator: 'isTrue' } // note: no value property
                    ],
                    actions: [
                        { type: 'sendEmail', parameters: { to: 'admin@example.com' } } // note: empty key ignored
                    ],
                    _ui: {
                        nodes: {
                            'rule-1': { type: 'rule', position: { x: 100, y: 100 } },
                            'trigger-1': { type: 'trigger', position: { x: 300, y: 50 } },
                            'cond-1': { type: 'conditions', position: { x: 300, y: 150 } },
                            'act-1': { type: 'actions', position: { x: 300, y: 250 } }
                        },
                        edges: [
                            { id: 'e-r1-t1', source: 'rule-1', target: 'trigger-1' },
                            { id: 'e-r1-c1', source: 'rule-1', target: 'cond-1' },
                            { id: 'e-r1-a1', source: 'rule-1', target: 'act-1' }
                        ]
                    }
                }
            });
        });

        it('should correctly serialize a rule with missing components (e.g., no conditions)', () => {
            const result = exportRuleRecordsWithUI(MOCK_NODES, MOCK_EDGES);
            const rule2Record = result.find(r => r.id === 'rule-2');

            expect(rule2Record).toBeDefined();
            expect(rule2Record?.spec.name).toBe('Low Stock Warning'); // fell back to label
            expect(rule2Record?.spec.conditions).toEqual([]); // empty array for missing conditions
            expect(rule2Record?.spec.trigger).toEqual({ type: 'inventoryUpdate', parameters: {} });
            expect(rule2Record?.spec.actions).toHaveLength(1);
        });

        it('should fallback to "Untitled Rule" if name and label are missing', () => {
            const unnamedNode: Node = {
                id: 'rule-3',
                type: 'rule',
                position: { x: 1, y: 1 },
                data: {} // no name or label
            };
            const result = exportRuleRecordsWithUI([unnamedNode], []);
            expect(result[0].name).toBe('Untitled Rule');
            expect(result[0].spec.name).toBe('Untitled Rule');
        });

        it('should handle missing data gracefully', () => {
            const minimalNode: Node = {
                id: 'rule-4',
                type: 'rule',
                position: { x: 1, y: 1 },
                data: {}
            };
            const triggerNode: Node = {
                id: 'trigger-4',
                type: 'trigger',
                position: { x: 1, y: 1 },
                data: {} // no triggerType or parameters
            }
            const edge: Edge = {id: 'e1', source: 'rule-4', target: 'trigger-4'}
            const result = exportRuleRecordsWithUI([minimalNode, triggerNode], [edge]);

            expect(result).toHaveLength(1);
            expect(result[0].spec.trigger).toEqual({ type: '', parameters: {} });
            expect(result[0].spec.conditions).toEqual([]);
            expect(result[0].spec.actions).toEqual([]);
        });
    });

    describe('exportSingleRuleRecord', () => {
        it('should return null if the ruleId does not exist', () => {
            const result = exportSingleRuleRecord(MOCK_NODES, MOCK_EDGES, 'non-existent-id');
            expect(result).toBeNull();
        });

        it('should return null if the provided ID is not for a rule node', () => {
            const result = exportSingleRuleRecord(MOCK_NODES, MOCK_EDGES, 'trigger-1');
            expect(result).toBeNull();
        });

        it('should correctly serialize only the specified rule', () => {
            const result = exportSingleRuleRecord(MOCK_NODES, MOCK_EDGES, 'rule-2');
            expect(result).not.toBeNull();
            expect(result?.id).toBe('rule-2');
            expect(result?.name).toBe('Low Stock Warning');
            expect(result?.spec._ui.nodes).toHaveProperty('rule-2');
            expect(result?.spec._ui.nodes).not.toHaveProperty('rule-1');
        });

        it('should produce the same record as the multi-export function for the same rule', () => {
            const singleResult = exportSingleRuleRecord(MOCK_NODES, MOCK_EDGES, 'rule-1');
            const multiResult = exportRuleRecordsWithUI(MOCK_NODES, MOCK_EDGES);
            const rule1FromMulti = multiResult.find(r => r.id === 'rule-1');

            expect(singleResult).toEqual(rule1FromMulti);
        });
    });
    
    describe('exportRulesJSON', () => {
        it('should be an alias for exportRuleRecordsWithUI', () => {
            const resultJSON = exportRulesJSON(MOCK_NODES, MOCK_EDGES);
            const resultRecords = exportRuleRecordsWithUI(MOCK_NODES, MOCK_EDGES);
            
            // It should call the same underlying function and produce the same output
            expect(resultJSON).toEqual(resultRecords);
            expect(resultJSON).toHaveLength(2);
        });
    });
});