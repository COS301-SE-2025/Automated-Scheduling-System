import type { Edge, Node } from 'reactflow';
import type { ActionsNodeData, ConditionsNodeData, RuleNodeData, TriggerNodeData, ParamKV } from '../types/rule.types';
import { listRuleRecords, createRule, updateRule, deleteRule, type RuleRecord, type RuleV2 } from '../services/ruleService';

// Build RuleV2 + _ui for a single rule id from the current graph
export function exportSingleRuleV2WithUI(nodes: Node[], edges: Edge[], ruleId: string): RuleV2 & { _ui: any } {
    const ruleNode = nodes.find((n) => n.type === 'rule' && n.id === ruleId);
    if (!ruleNode) throw new Error('Rule node not found');

    const linkedIds = edges
        .filter((e) => e.source === ruleId || e.target === ruleId)
        .map((e) => (e.source === ruleId ? e.target : e.source));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const children = linkedIds.map((id) => byId.get(id)).filter(Boolean) as Node[];
    const subNodeIds = new Set([ruleId, ...children.map((n) => n.id)]);
    const subEdges = edges.filter((e) => subNodeIds.has(e.source) && subNodeIds.has(e.target));

    const rdata = ruleNode.data as RuleNodeData;
    const trigger = children.find((n) => n.type === 'trigger')?.data as TriggerNodeData | undefined;
    const conditions = children.find((n) => n.type === 'conditions')?.data as ConditionsNodeData | undefined;
    const actions = children.find((n) => n.type === 'actions')?.data as ActionsNodeData | undefined;

    const kvToObj = (arr: ParamKV[] = []) => {
        const obj: Record<string, string> = {};
        for (const { key, value } of arr) if (key) obj[key] = value;
        return obj;
    };

    // Ensure UI node types are strings (Node.type is optional in React Flow)
    const toUIPos = (pos: any) => ({ x: Number(pos?.x) || 0, y: Number(pos?.y) || 0 });
    const childEntries: [string, { type: string; position: { x: number; y: number } }][] = children
        .filter((n): n is Node & { type: string } => typeof n.type === 'string')
        .map((n) => [n.id, { type: n.type, position: toUIPos((n as any).position) }]);

    const uiNodes: Record<string, { type: string; position: { x: number; y: number } }> = {
        [ruleNode.id]: { type: 'rule', position: toUIPos(ruleNode.position) },
        ...Object.fromEntries(childEntries),
    };

    return {
        name: rdata.name || rdata.label || 'Untitled Rule',
        trigger: trigger
            ? { type: trigger.triggerType || '', parameters: kvToObj(trigger.parameters || []) }
            : { type: '', parameters: {} },
        conditions: (conditions?.conditions || []).map((c) => ({
            fact: c.fact || '',
            operator: c.operator || 'equals',
            ...(c.operator === 'isTrue' || c.operator === 'isFalse' ? {} : { value: c.value ?? '' }),
        })),
        actions: (actions?.actions || []).map((a) => ({
            type: a.type || '',
            parameters: kvToObj(a.parameters || []),
        })),
        _ui: {
            nodes: uiNodes,
            edges: subEdges.map((e) => ({ id: e.id, source: e.source, target: e.target })),
        },
    };
}

// Save or update a single rule to the backend
export async function saveRuleToBackend(
    nodes: Node[],
    edges: Edge[],
    ruleId: string,
    backendId?: string | number
) {
    const spec = exportSingleRuleV2WithUI(nodes, edges, ruleId);

    const hasValidId = (id: unknown): id is string | number =>
        (typeof id === 'number' && Number.isFinite(id)) ||
        (typeof id === 'string' && id.trim().length > 0); // accept non-empty strings like "rule_123"

    let targetId: string | number | undefined = backendId;

    // If we don't have a valid backend id, try to find an existing rule by canvas rule id in _ui
    if (!hasValidId(targetId)) {
        try {
            const records = await listRuleRecords();
            const match = records.find((r) => {
                const ui = (r as any)?.spec?._ui ?? (r as any)?._ui;
                return ui && ui.nodes && Object.prototype.hasOwnProperty.call(ui.nodes, ruleId);
            });
            if (match) targetId = match.id;
        } catch {
            // ignore lookup failures and fall back to create
        }
    }

    if (hasValidId(targetId)) {
        await updateRule(String(targetId), spec);
        setNodeBackendId(nodes, ruleId, targetId);
        return targetId; // keep the same id type
    }

    const created = await createRule(spec);
    setNodeBackendId(nodes, ruleId, created.id);
    return created.id; // use backend-provided id
}

function setNodeBackendId(nodes: Node[], ruleId: string, id: string | number) {
    const n = nodes.find((x) => x.id === ruleId && x.type === 'rule');
    if (n && n.data) {
        (n.data as RuleNodeData).backendId = id;
        (n.data as RuleNodeData).saved = true;
    }
}

// Delete a rule in the backend (if persisted)
export async function deleteRuleInBackend(backendId?: string | number) {
    const hasValidId = (id: unknown): id is string | number =>
        (typeof id === 'number' && Number.isFinite(id)) ||
        (typeof id === 'string' && id.trim().length > 0); // accept "rule_*" ids

    if (!hasValidId(backendId)) return;
    await deleteRule(String(backendId));
}

// Build canvas from backend records’ _ui
export function materializeFromRecords(records: RuleRecord[]): { nodes: Node[]; edges: Edge[] } {
    const nodesMap = new Map<string, Node>();
    const edges: Edge[] = [];

    for (const rec of records) {
        const ui = (rec as any)?.spec?._ui ?? (rec as any)?._ui;
        if (!ui) continue;

        for (const [id, meta] of Object.entries<any>(ui.nodes || {})) {
            if (nodesMap.has(id)) continue;
            nodesMap.set(id, {
                id,
                type: meta.type,
                position: meta.position || { x: 0, y: 0 },
                data: buildNodeData(meta.type, rec),
            } as Node);
        }

        for (const e of ui.edges || []) {
            const exists = edges.some(
                (x) => (x.id && e.id && x.id === e.id) || (x.source === e.source && x.target === e.target)
            );
            if (!exists) edges.push({ id: e.id ?? `${e.source}-${e.target}`, source: e.source, target: e.target } as Edge);
        }
    }

    return { nodes: Array.from(nodesMap.values()), edges };
}

function buildNodeData(type: string, rec: RuleRecord) {
    const spec = (rec as any).spec || (rec as any);
    switch (type) {
        case 'rule':
            return {
                label: rec.name,
                name: rec.name,
                saved: true,
                backendId: (rec as any).id,
            } as RuleNodeData;
        case 'trigger':
            return {
                label: 'Trigger',
                triggerType: spec?.trigger?.type || '',
                parameters: objToKV(spec?.trigger?.parameters || {}),
            } as TriggerNodeData;
        case 'conditions':
            return {
                label: 'Conditions',
                conditions: spec?.conditions || [],
            } as ConditionsNodeData;
        case 'actions':
            return {
                label: 'Actions',
                actions: (spec?.actions || []).map((a: any) => ({
                    type: a.type,
                    parameters: objToKV(a.parameters || {}),
                })),
            } as ActionsNodeData;
        default:
            return { label: type };
    }
}

function objToKV(obj: Record<string, string>) {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

export async function materializeFromBackend(): Promise<{ nodes: Node[]; edges: Edge[] }> {
    const records = await listRuleRecords();
    return materializeFromRecords(records);
}