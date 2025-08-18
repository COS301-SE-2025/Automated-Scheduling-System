import type { Edge, Node } from 'reactflow';
import { exportRuleRecordsWithUI, exportSingleRuleRecord, type StoredRuleRecord } from './ruleSerialiser';

const CANVAS_KEY = 'rules:canvas:v1';
const LIB_KEY = 'rules:library:v1';

export function saveCanvas(nodes: Node[], edges: Edge[]) {
    const payload = { nodes, edges, savedAt: new Date().toISOString() };
    localStorage.setItem(CANVAS_KEY, JSON.stringify(payload));
    // Also maintain a library of atomic rule records
    const records = exportRuleRecordsWithUI(nodes, edges);
    localStorage.setItem(LIB_KEY, JSON.stringify(records));
}

export function loadCanvas(): { nodes: Node[]; edges: Edge[] } | null {
    const raw = localStorage.getItem(CANVAS_KEY);
    if (!raw) return null;
    try {
        const { nodes, edges } = JSON.parse(raw);
        return { nodes, edges };
    } catch {
        return null;
    }
}

export function loadRuleLibrary(): StoredRuleRecord[] {
    const raw = localStorage.getItem(LIB_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as StoredRuleRecord[];
    } catch {
        return [];
    }
}

export function upsertRuleRecord(rec: StoredRuleRecord) {
    const list = loadRuleLibrary();
    const idx = list.findIndex(r => r.id === rec.id);
    if (idx >= 0) {
        list[idx] = { ...rec, createdAt: list[idx].createdAt, updatedAt: rec.updatedAt };
    } else {
        list.push(rec);
    }
    localStorage.setItem(LIB_KEY, JSON.stringify(list));
}

export function deleteRuleFromLibrary(ruleId: string) {
    const list = loadRuleLibrary();
    const next = list.filter(r => r.id !== ruleId);
    localStorage.setItem(LIB_KEY, JSON.stringify(next));
}

/**
 * Save only a single rule (identified by ruleId) from the current graph to the library.
 * Does not overwrite the whole canvas snapshot.
 */
export function saveRuleFromGraph(nodes: Node[], edges: Edge[], ruleId: string): StoredRuleRecord | null {
    const rec = exportSingleRuleRecord(nodes, edges, ruleId);
    if (!rec) return null;
    upsertRuleRecord(rec);
    return rec;
}

/**
 * If no canvas save exists, reconstruct nodes/edges from the rule library’s spec._ui
 */
export function materializeFromLibrary(): { nodes: Node[]; edges: Edge[] } | null {
    const records = loadRuleLibrary();
    if (!records.length) return null;

    const nodesMap = new Map<string, Node>();
    const edges: Edge[] = [];

    for (const rec of records) {
        const ui = rec.spec?._ui;
        if (!ui) continue;

        // Create nodes if not already placed
        for (const [id, meta] of Object.entries<any>(ui.nodes || {})) {
            if (nodesMap.has(id)) continue;
            nodesMap.set(id, {
                id,
                type: meta.type,
                position: meta.position || { x: 0, y: 0 },
                data: createNodeData(meta.type, rec),
            } as Node);
        }

        for (const e of ui.edges || []) {
            // dedupe edges by id/source-target pair
            const exists = edges.some(x => (x.id && e.id && x.id === e.id) || (x.source === e.source && x.target === e.target));
            if (!exists) edges.push({ id: e.id ?? `${e.source}-${e.target}`, source: e.source, target: e.target } as Edge);
        }
    }

    return { nodes: Array.from(nodesMap.values()), edges };
}

function createNodeData(type: string, rec: StoredRuleRecord) {
    switch (type) {
        case 'rule':
            return { label: rec.name, name: rec.name, saved: true };
        case 'trigger':
            return {
                label: 'Trigger',
                triggerType: rec.spec?.trigger?.type || '',
                parameters: objectToKV(rec.spec?.trigger?.parameters || {}),
            };
        case 'conditions':
            return {
                label: 'Conditions',
                conditions: rec.spec?.conditions || [],
            };
        case 'actions':
            return {
                label: 'Actions',
                actions: (rec.spec?.actions || []).map((a: any) => ({
                    type: a.type,
                    parameters: objectToKV(a.parameters || {}),
                })),
            };
        default:
            return { label: type };
    }
}

function objectToKV(obj: Record<string, string>) {
    return Object.entries(obj).map(([key, value]) => ({ key, value }));
}

// re-export the type so callers can `import type { StoredRuleRecord } from '../../utils/canvasStorage'`
export type { StoredRuleRecord } from './ruleSerialiser';