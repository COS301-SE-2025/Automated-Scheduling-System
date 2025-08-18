import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { ActionsNodeData, ActionRow, ParamKV } from '../../types/rule.types';

// stubbed until backend provides lists
const ACTION_TYPES = ['SEND_NOTIFICATION', 'UPDATE_COMPLIANCE_STATUS', 'CREATE_TASK'];

const ActionsNode: React.FC<NodeProps<ActionsNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();

    const update = (partial: Partial<ActionsNodeData>) => {
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
                    const cur = n.data as ActionsNodeData;
                    return { ...n, data: { ...cur, ...partial } };
                }
                if (n.type === 'rule' && ruleIds.has(n.id)) {
                    return { ...n, data: { ...(n.data as any), saved: false } };
                }
                return n;
            })
        );
    };

    const setAction = (idx: number, patch: Partial<ActionRow>) => {
        const next = data.actions.map((a, i) => (i === idx ? { ...a, ...patch } : a));
        update({ actions: next });
    };

    const addAction = () => update({ actions: [...data.actions, { type: '', parameters: [] }] });
    const removeAction = (idx: number) => update({ actions: data.actions.filter((_, i) => i !== idx) });

    const setParam = (aIdx: number, pIdx: number, patch: Partial<ParamKV>) => {
        const next = data.actions.map((a, i) => {
            if (i !== aIdx) return a;
            const params = a.parameters.map((p, j) => (j === pIdx ? { ...p, ...patch } : p));
            return { ...a, parameters: params };
        });
        update({ actions: next });
    };

    const addParam = (aIdx: number) => {
        const next = data.actions.map((a, i) =>
            i === aIdx ? { ...a, parameters: [...a.parameters, { key: '', value: '' }] } : a
        );
        update({ actions: next });
    };

    const removeParam = (aIdx: number, pIdx: number) => {
        const next = data.actions.map((a, i) =>
            i === aIdx ? { ...a, parameters: a.parameters.filter((_, j) => j !== pIdx) } : a
        );
        update({ actions: next });
    };

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

    const valueInput = (metaParamType?: string, value = '', onChange?: (v: string) => void) => {
        const type = metaParamType || 'string';
        const stopAll = {
            onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
            onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
            onWheel: (e: React.WheelEvent) => {
                e.preventDefault();
                e.stopPropagation();
            },
            onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
        };

        if (type === 'boolean') {
            return (
                <select
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    {...stopAll}
                >
                    <option value="">Select…</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }
        if (type === 'number') {
            // Fallback to text input to avoid auto-increment issues
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    {...stopAll}
                />
            );
        }
        if (type === 'date') {
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="date"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    {...stopAll}
                />
            );
        }
        return (
            <input
                className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                value={value}
                onChange={(e) => onChange?.(e.target.value)}
                {...stopAll}
            />
        );
    };

    return (
        <div
            className="bg-white border-2 border-violet-300 rounded-md shadow-md w-[34rem] text-gray-800"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
            <Handle type="target" position={Position.Top} isValidConnection={validIfRule} />
            <Handle type="source" position={Position.Bottom} isValidConnection={validIfRule} />
            <div className="bg-violet-50 p-2 font-semibold rounded-t-md flex items-center justify-between">
                <span>{data.label || 'Actions'}</span>
                <button className="text-xs px-2 py-0.5 border rounded" onClick={onDelete} type="button" aria-label="Delete actions block">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="p-2">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold">Actions</span>
                    <button className="text-xs px-2 py-0.5 border rounded" onClick={addAction} type="button">
                        <PlusCircle size={16} />
                    </button>
                </div>

                <div className="space-y-3">
                    {data.actions.map((a, aIdx) => (
                        <div key={aIdx} className="border rounded p-2">
                            <div className="flex items-center gap-2 mb-2">
                                <label className="text-sm text-gray-700">Type</label>
                                <select
                                    className="flex-1 border rounded px-2 py-1 bg-white text-gray-800"
                                    value={a.type}
                                    onChange={(e) => setAction(aIdx, { type: e.target.value })}
                                >
                                    <option value="">Select action...</option>
                                    {ACTION_TYPES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                                <button className="px-2 border rounded text-xs" onClick={() => removeAction(aIdx)} type="button" aria-label="Remove action">
                                    ×
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-sm font-semibold">Parameters</span>
                                    <button className="text-xs px-2 py-0.5 border rounded" onClick={() => addParam(aIdx)} type="button">
                                        + Add
                                    </button>
                                </div>
                                <div className="space-y-1">
                                    {a.parameters.map((p, pIdx) => (
                                        <div key={pIdx} className="flex gap-1">
                                            <input
                                                className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                                                placeholder="key"
                                                value={p.key}
                                                onChange={(e) => setParam(aIdx, pIdx, { key: e.target.value })}
                                            />
                                            <input
                                                className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                                                placeholder="value"
                                                value={p.value}
                                                onChange={(e) => setParam(aIdx, pIdx, { value: e.target.value })}
                                            />
                                            <button className="px-2 border rounded text-xs" onClick={() => removeParam(aIdx, pIdx)} type="button" aria-label="Remove parameter">
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                    {a.parameters.length === 0 && (
                                        <p className="text-xs text-gray-400 text-center">No parameters</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {data.actions.length === 0 && (
                        <p className="text-xs text-gray-400 text-center">No actions</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionsNode;