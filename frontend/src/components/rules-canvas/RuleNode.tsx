//frontend/src/components/rules-canvas/RuleNode.tsx
import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection, useStore } from 'reactflow';
import { Trash2 } from 'lucide-react';
import type { RuleNodeData } from '../../types/rule.types';
import { saveRuleToBackend } from '../../utils/canvasBackend';
import { useRulesMetadata } from '../../contexts/RulesMetadataContext';

const RuleNode: React.FC<NodeProps<RuleNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();

    const nodes = useStore((s) => Array.from(s.nodeInternals.values()));
    const edges = useStore((s) => s.edges);
    const { byTrigger, byAction } = useRulesMetadata();

    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        rf.setNodes((nds) =>
            nds.map((n) => (n.id === id ? { ...n, data: { ...n.data, label: name, name, saved: false } } : n))
        );
    };
    const onDelete = () => {
        const name = (data as any)?.name || (data as any)?.label || 'Rule';
        window.dispatchEvent(new CustomEvent('rule:confirm-delete', { detail: { id, name } }));
    };

    const validIfRule = (c: Connection) => {
        if (!c.source || !c.target) return false;
        const s = rf.getNode(c.source);
        const t = rf.getNode(c.target);
        if (!s || !t) return false;
        if (!(s.type === 'rule' || t.type === 'rule')) return false;
        // allow rule-to-rule
        if (s.type === 'rule' && t.type === 'rule') return true;

        const rule = s.type === 'rule' ? s : t;
        const other = s.type === 'rule' ? t : s;

        if (other.type === 'trigger' || other.type === 'conditions' || other.type === 'actions') {
            const edges = rf.getEdges?.() ?? [];
            // block duplicate
            const duplicate = edges.some(e =>
                (e.source === c.source && e.target === c.target) ||
                (e.source === c.target && e.target === c.source)
            );
            if (duplicate) return false;

            // block if rule already linked to this type
            const nodes = rf.getNodes?.() ?? [];
            const hasSameType = edges.some(e => {
                if (!(e.source === rule.id || e.target === rule.id)) return false;
                const a = nodes.find(n => n.id === e.source);
                const b = nodes.find(n => n.id === e.target);
                if (!a || !b) return false;
                const nonRule = a.type === 'rule' ? b : a;
                return nonRule.type === other.type;
            });
            if (hasSameType) return false;
        }

        return true;
    };

    // helpers for save
    const neighborIds = edges
        .filter((e) => e.source === id || e.target === id)
        .map((e) => (e.source === id ? e.target : e.source));
    const neighbors = nodes.filter((n) => neighborIds.includes(n.id));
    const types = new Set(neighbors.map((n) => n.type));
    const isComplete = types.has('trigger') && types.has('conditions') && types.has('actions');

    const isSaved = Boolean((data as any).saved);

    const onSave = async () => {
        if (!isComplete) {
            window.alert('A rule must be connected to a Trigger, Conditions, and Actions block before saving.');
            return;
        }

        // Validate name
        const ruleName = (data as any)?.name ?? (data as any)?.label ?? '';
        if (!String(ruleName).trim()) {
            window.alert('Please provide a name for the rule.');
            return;
        }

        // Collect neighbors (trigger/actions nodes)
        const neighborIds = edges
            .filter((e) => e.source === id || e.target === id)
            .map((e) => (e.source === id ? e.target : e.source));
        const neighbors = nodes.filter((n) => neighborIds.includes(n.id));

        const triggerData = neighbors.find((n) => n.type === 'trigger')?.data as any | undefined;
        const actionsData = neighbors.find((n) => n.type === 'actions')?.data as any | undefined;

        // Basic numeric validator (accepts integers or decimals, optional leading minus)
        const isNumberString = (v: unknown) => /^-?\d+(\.\d+)?$/.test(String(v));

        const errors: string[] = [];

        // Validate trigger params from metadata
        if (triggerData?.triggerType) {
            const tMeta = byTrigger.get(triggerData.triggerType);
            const tMetaMap = new Map((tMeta?.parameters || []).map((p) => [p.name, p]));

            for (const p of triggerData.parameters || []) {
                const def = tMetaMap.get(p.key);
                if (!def) continue;

                const val = p.value;
                const hasVal = !(val === '' || val === undefined || val === null);

                if (def.required && !hasVal) {
                    errors.push(`Trigger parameter '${p.key}' is required`);
                }
                if (def.type === 'number' && hasVal && !isNumberString(val)) {
                    errors.push(`Trigger parameter '${p.key}' must be a number`);
                }
                if (Array.isArray((def as any).options) && (def as any).options.length && hasVal) {
                    const ok = (def as any).options.map(String).includes(String(val));
                    if (!ok) errors.push(`Trigger parameter '${p.key}' must be one of: ${((def as any).options || []).join(', ')}`);
                }
            }
        }

        // Validate action params from metadata
        if (actionsData?.actions?.length) {
            actionsData.actions.forEach((act: any, idx: number) => {
                if (!act?.type) {
                    errors.push(`Action[${idx + 1}] type is required`);
                    return;
                }
                const aMeta = byAction.get(act.type);
                const aMetaMap = new Map((aMeta?.parameters || []).map((p) => [p.name, p]));

                for (const ap of act.parameters || []) {
                    const def = aMetaMap.get(ap.key);
                    if (!def) continue;

                    const val = ap.value;
                    const hasVal = !(val === '' || val === undefined || val === null);

                    if (def.required && !hasVal) {
                        errors.push(`Action[${idx + 1}] parameter '${ap.key}' is required`);
                    }
                    if (def.type === 'number' && hasVal && !isNumberString(val)) {
                        errors.push(`Action[${idx + 1}] parameter '${ap.key}' must be a number`);
                    }
                    if (Array.isArray((def as any).options) && (def as any).options.length && hasVal) {
                        const ok = (def as any).options.map(String).includes(String(val));
                        if (!ok) errors.push(`Action[${idx + 1}] parameter '${ap.key}' must be one of: ${((def as any).options || []).join(', ')}`);
                    }
                }
            });
        }

        if (errors.length) {
            window.alert(errors.join('\n'));
            return;
        }

        const allNodes = rf.getNodes?.() ?? (nodes as any);
        const allEdges = rf.getEdges?.() ?? (edges as any);
        try {
            const newId = await saveRuleToBackend(allNodes as any, allEdges as any, id, (data as any)?.backendId);
            // mark saved + store backend id
            rf.setNodes((nds) =>
                nds.map((n) =>
                    n.id === id ? { ...n, data: { ...(n.data as any), saved: true, backendId: newId } } : n
                )
            );
            window.dispatchEvent(
                new CustomEvent('rule:saved', { detail: { id, name: (data as any)?.name || (data as any)?.label } })
            );
        } catch (e) {
            window.alert('Failed to save rule. Please try again. ' + e);
        }
    };

    return (
        <div className="bg-white border-2 border-blue-300 rounded-md shadow-md w-64 text-gray-800">
            <Handle type="target" position={Position.Top} isValidConnection={validIfRule} />
            <Handle type="source" position={Position.Bottom} isValidConnection={validIfRule} />
            <div className="bg-blue-50 p-2 font-semibold rounded-t-md flex items-center justify-between gap-2">
                <span>Rule</span>
                <div className="flex items-center gap-1">
                    <button
                        className={`text-xs px-2 py-0.5 border rounded ${isComplete && !isSaved ? '' : 'opacity-50 cursor-not-allowed'}`}
                        onClick={onSave}
                        type="button"
                        title={
                            isSaved
                                ? 'Rule is saved'
                                : isComplete
                                    ? 'Save rule'
                                    : 'Connect Trigger, Conditions, and Actions to enable saving'
                        }
                        disabled={!isComplete || isSaved}
                    >
                        {isSaved ? 'Saved' : 'Save'}
                    </button>
                    <button className="text-xs px-2 py-0.5 border rounded" onClick={onDelete} type="button" aria-label="Delete rule">
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
            <div className="p-3">
                <input
                    value={data.name ?? data.label}
                    onChange={onChange}
                    placeholder="Rule name"
                    className="text-center font-bold bg-transparent focus:outline-none w-full text-gray-800"
                />
            </div>
        </div>
    );
};

export default RuleNode;