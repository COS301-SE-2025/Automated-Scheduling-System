//frontend/src/utils/ruleSerialiser.ts
import type { Edge, Node } from 'reactflow';
import type {
    ActionsNodeData,
    ConditionsNodeData,
    TriggerNodeData,
    RuleNodeData,
    ParamKV,
} from '../types/rule.types';

export type StoredRuleRecord = {
    id: string; // simulate backend uint with uuid
    name: string;
    triggerType: string;
    spec: any; // full Rule JSON, includes _ui
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
};

function linkedOf(nodeId: string, edges: Edge[]): string[] {
    return edges
        .filter((e) => e.source === nodeId || e.target === nodeId)
        .map((e) => (e.source === nodeId ? e.target : e.source));
}

function kvArrayToObject(arr: ParamKV[]): Record<string, string> {
    const obj: Record<string, string> = {};
    for (const { key, value } of arr) {
        if (key) obj[key] = value;
    }
    return obj;
}

function neighborsOfRule(ruleId: string, nodes: Node[], edges: Edge[]) {
    const linkedIds = linkedOf(ruleId, edges);
    const byId = new Map(nodes.map(n => [n.id, n]));
    const children = linkedIds.map(id => byId.get(id)).filter(Boolean) as Node[];
    const subNodeIds = new Set([ruleId, ...children.map(n => n.id)]);
    const subEdges = edges.filter(e => subNodeIds.has(e.source) && subNodeIds.has(e.target));
    return { children, subEdges };
}

/**
 * Builds backend-like records for each Rule node, embedding UI layout under spec._ui
 */
export function exportRuleRecordsWithUI(nodes: Node[], edges: Edge[]): StoredRuleRecord[] {
    const now = new Date().toISOString();
    const records: StoredRuleRecord[] = [];

    for (const ruleNode of nodes.filter(n => n.type === 'rule')) {
        const rdata = ruleNode.data as RuleNodeData;
        const { children, subEdges } = neighborsOfRule(ruleNode.id, nodes, edges);

        const trigger = children.find(n => n.type === 'trigger')?.data as TriggerNodeData | undefined;
        const conditions = children.find(n => n.type === 'conditions')?.data as ConditionsNodeData | undefined;
        const actions = children.find(n => n.type === 'actions')?.data as ActionsNodeData | undefined;

        const spec = {
            name: rdata.name || rdata.label || 'Untitled Rule',
            trigger: trigger
                ? { type: trigger.triggerType || '', parameters: kvArrayToObject(trigger.parameters || []) }
                : null,
            conditions: (conditions?.conditions || []).map(c => ({
                fact: c.fact || '',
                operator: c.operator || 'equals',
                ...(c.operator === 'isTrue' || c.operator === 'isFalse' ? {} : { value: c.value ?? '' }),
            })),
            actions: (actions?.actions || []).map(a => ({
                type: a.type || '',
                parameters: kvArrayToObject(a.parameters || []),
            })),
            // UI metadata to reconstruct canvas layout
            _ui: {
                nodes: {
                    [ruleNode.id]: { type: 'rule', position: ruleNode.position },
                    ...Object.fromEntries(
                        children.map(n => [n.id, { type: n.type, position: n.position }])
                    ),
                },
                edges: subEdges.map(e => ({ id: e.id, source: e.source, target: e.target })),
            },
        };

        records.push({
            id: ruleNode.id, // reuse canvas id; backend can swap to uint later
            name: spec.name,
            triggerType: trigger?.triggerType || '',
            spec,
            enabled: true,
            createdAt: now,
            updatedAt: now,
        });
    }

    return records;
}

// Build a single StoredRuleRecord for one rule id
export function exportSingleRuleRecord(nodes: Node[], edges: Edge[], ruleId: string): StoredRuleRecord | null {
    const ruleNode = nodes.find(n => n.type === 'rule' && n.id === ruleId);
    if (!ruleNode) return null;

    const now = new Date().toISOString();
    const rdata = ruleNode.data as RuleNodeData;
    const { children, subEdges } = neighborsOfRule(ruleNode.id, nodes, edges);

    const trigger = children.find(n => n.type === 'trigger')?.data as TriggerNodeData | undefined;
    const conditions = children.find(n => n.type === 'conditions')?.data as ConditionsNodeData | undefined;
    const actions = children.find(n => n.type === 'actions')?.data as ActionsNodeData | undefined;

    const spec = {
        name: rdata.name || rdata.label || 'Untitled Rule',
        trigger: trigger
            ? { type: trigger.triggerType || '', parameters: kvArrayToObject(trigger.parameters || []) }
            : null,
        conditions: (conditions?.conditions || []).map(c => ({
            fact: c.fact || '',
            operator: c.operator || 'equals',
            ...(c.operator === 'isTrue' || c.operator === 'isFalse' ? {} : { value: c.value ?? '' }),
        })),
        actions: (actions?.actions || []).map(a => ({
            type: a.type || '',
            parameters: kvArrayToObject(a.parameters || []),
        })),
        _ui: {
            nodes: {
                [ruleNode.id]: { type: 'rule', position: ruleNode.position },
                ...Object.fromEntries(children.map(n => [n.id, { type: n.type, position: n.position }])),
            },
            edges: subEdges.map(e => ({ id: e.id, source: e.source, target: e.target })),
        },
    };

    return {
        id: ruleNode.id,
        name: spec.name,
        triggerType: trigger?.triggerType || '',
        spec,
        enabled: true,
        createdAt: now,
        updatedAt: now,
    };
}

// Provide the API expected by RulesPage.tsx
export function exportRulesJSON(nodes: Node[], edges: Edge[]) {
    // For now, preview the backend-like records (including spec._ui)
    return exportRuleRecordsWithUI(nodes, edges);
}