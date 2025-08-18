import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { ConditionsNodeData, ConditionRow } from '../../types/rule.types';

const OPERATORS = ['equals', 'notEquals', 'greaterThan', 'lessThan', 'greaterOrEquals', 'lessOrEquals', 'isTrue', 'isFalse', 'in', 'notIn', 'contains', 'startsWith', 'endsWith'];

const ConditionsNode: React.FC<NodeProps<ConditionsNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();

    const update = (partial: Partial<ConditionsNodeData>) => {
        const edges = rf.getEdges?.() ?? [];
        const ruleIds = new Set<string>();
        for (const e of edges) {
            if (e.source === id || e.target === id) {
                const otherId = e.source === id ? e.target : e.source;
                const other = rf.getNode(otherId);
                if (other?.type === 'rule') ruleIds.add(other.id);
            }
        }

        rf.setNodes((nds) =>
            nds.map((n) => {
                if (n.id === id) {
                    const cur = n.data as ConditionsNodeData;
                    return { ...n, data: { ...cur, ...partial } };
                }
                if (n.type === 'rule' && ruleIds.has(n.id)) {
                    return { ...n, data: { ...(n.data as any), saved: false } };
                }
                return n;
            })
        );
    };

    const setRow = (idx: number, patch: Partial<ConditionRow>) => {
        const next = data.conditions.map((r, i) => (i === idx ? { ...r, ...patch } : r));
        update({ conditions: next });
    };
    const addRow = () => update({ conditions: [...data.conditions, { fact: '', operator: 'equals', value: '' }] });
    const removeRow = (idx: number) => update({ conditions: data.conditions.filter((_, i) => i !== idx) });
    const onDelete = () => rf.deleteElements({ nodes: [{ id }] });

    const validIfRule = (c: Connection) => {
        if (!c.source || !c.target) return false;
        const s = rf.getNode(c.source);
        const t = rf.getNode(c.target);
        if (!s || !t) return false;
        if (!(s.type === 'rule' || t.type === 'rule')) return false;
        if (s.type === 'rule' && t.type === 'rule') return true;

        const rule = s.type === 'rule' ? s : t;
        const other = s.type === 'rule' ? t : s;

        if (other.type === 'trigger' || other.type === 'conditions' || other.type === 'actions') {
            const edges = rf.getEdges?.() ?? [];
            const duplicate = edges.some(e =>
                (e.source === c.source && e.target === c.target) ||
                (e.source === c.target && e.target === c.source)
            );
            if (duplicate) return false;

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

    return (
        <div className="bg-white border-2 border-emerald-300 rounded-md shadow-md w-[34rem] text-gray-800">
            <Handle type="target" position={Position.Top} isValidConnection={validIfRule} />
            <Handle type="source" position={Position.Bottom} isValidConnection={validIfRule} />

            <div className="bg-emerald-50 p-2 font-semibold rounded-t-md flex items-center justify-between">
                <span>{data.label || 'Conditions'}</span>
                <button className="text-xs px-2 py-0.5 border rounded" onClick={onDelete} type="button" aria-label="Delete conditions">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Conditions</span>
                    <button className="text-xs px-2 py-0.5 border rounded" onClick={addRow} type="button">
                        <PlusCircle size={16} />
                    </button>
                </div>
                <div className="space-y-2">
                    {data.conditions.map((c, idx) => {
                        const valueDisabled = c.operator === 'isTrue' || c.operator === 'isFalse';
                        return (
                            <div key={idx} className="flex gap-1">
                                <input
                                    className="w-[35%] border rounded px-2 py-1 bg-white text-gray-800"
                                    placeholder="fact (e.g. employee.EmployeeStatus)"
                                    value={c.fact}
                                    onChange={(e) => setRow(idx, { fact: e.target.value })}
                                />
                                <select
                                    className="w-[45%] min-w-[240px] border rounded px-2 py-1 bg-white text-gray-800"
                                    value={c.operator}
                                    onChange={(e) => setRow(idx, { operator: e.target.value })}
                                >
                                    {OPERATORS.map((op) => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                                <input
                                    className="w-[20%] border rounded px-2 py-1 bg-white text-gray-800"
                                    placeholder="value"
                                    value={c.value ?? ''}
                                    onChange={(e) => setRow(idx, { value: e.target.value })}
                                    disabled={valueDisabled}
                                />
                                <button className="px-2 border rounded text-xs" onClick={() => removeRow(idx)} type="button" aria-label="Remove condition">
                                    ×
                                </button>
                            </div>
                        );
                    })}
                    {data.conditions.length === 0 && (
                        <p className="text-xs text-gray-400 text-center">No conditions</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ConditionsNode;