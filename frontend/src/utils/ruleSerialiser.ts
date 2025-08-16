//frontend/src/utils/ruleSerialiser.ts
import type { Edge, Node } from 'reactflow';
import type {
    ActionsNodeData,
    ConditionsNodeData,
    TriggerNodeData,
    RuleNodeData,
    ParamKV,
} from '../types/rule.types';

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

export function exportRulesJSON(nodes: Node[], edges: Edge[]) {
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const rules = nodes
        .filter((n) => n.type === 'rule')
        .map((ruleNode) => {
            const rdata = ruleNode.data as RuleNodeData;
            const result: any = {
                name: rdata.name || rdata.label || 'Untitled Rule',
                trigger: null,
                conditions: [],
                actions: [],
            };

            for (const neighborId of linkedOf(ruleNode.id, edges)) {
                const child = byId.get(neighborId);
                if (!child || child.type === 'rule') continue;

                if (child.type === 'trigger') {
                    const t = child.data as TriggerNodeData;
                    result.trigger = {
                        type: t.triggerType || '',
                        parameters: kvArrayToObject(t.parameters || []),
                    };
                } else if (child.type === 'conditions') {
                    const cdata = child.data as ConditionsNodeData;
                    result.conditions = (cdata.conditions || []).map((c) => ({
                        fact: c.fact || '',
                        operator: c.operator || 'equals',
                        ...(c.operator === 'isTrue' || c.operator === 'isFalse' ? {} : { value: c.value ?? '' }),
                    }));
                } else if (child.type === 'actions') {
                    const adata = child.data as ActionsNodeData;
                    result.actions = (adata.actions || []).map((a) => ({
                        type: a.type || '',
                        parameters: kvArrayToObject(a.parameters || []),
                    }));
                }
            }

            return result;
        });

    return rules.length === 1 ? rules[0] : rules;
}