import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { TriggerNodeData, ParamKV } from '../../types/rule.types';
import { useRulesMetadata } from '../../contexts/RulesMetadataContext';

const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();
    const { triggers, byTrigger } = useRulesMetadata();

    const update = (partial: Partial<TriggerNodeData>) => {
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
                    const cur = n.data as TriggerNodeData;
                    return { ...n, data: { ...cur, ...partial } };
                }
                if (n.type === 'rule' && ruleIds.has(n.id)) {
                    return { ...n, data: { ...(n.data as any), saved: false } };
                }
                return n;
            })
        );
    };

    const setTriggerType = (newType: string) => {
        const meta = byTrigger.get(newType);
        const params: ParamKV[] = meta ? meta.parameters.map((p) => ({ key: p.name, value: '' })) : [];
        update({ triggerType: newType, parameters: params });
    };

    const setParam = (idx: number, patch: Partial<ParamKV>) => {
        const next = data.parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p));
        update({ parameters: next });
    };
    const addParam = () => update({ parameters: [...data.parameters, { key: '', value: '' }] }); // extra param
    const removeParam = (idx: number) => update({ parameters: data.parameters.filter((_, i) => i !== idx) });
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

    const meta = byTrigger.get(data.triggerType);
    const metaParamMap = new Map((meta?.parameters || []).map((p) => [p.name, p]));

    const renderValueInput = (p: ParamKV, idx: number) => {
        const def = metaParamMap.get(p.key);
        const type = def?.type || 'string';
        const required = def?.required;
        const placeholder = `${type}${required ? ' • required' : ''}`;
        if (type === 'boolean') {
            return (
                <select
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                >
                    <option value="">Select…</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }
        if (type === 'number') {
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="number"
                    placeholder={placeholder}
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                />
            );
        }
        if (type === 'date') {
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="date"
                    placeholder={placeholder}
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                />
            );
        }
        return (
            <input
                className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                placeholder={placeholder}
                value={p.value}
                onChange={(e) => setParam(idx, { value: e.target.value })}
            />
        );
    };

    return (
        <div className="bg-white border-2 border-amber-300 rounded-md shadow-md w-72 text-gray-800">
            <Handle type="target" position={Position.Top} isValidConnection={validIfRule} />
            <Handle type="source" position={Position.Bottom} isValidConnection={validIfRule} />

            <div className="bg-amber-50 p-2 font-semibold rounded-t-md flex items-center justify-between">
                <span>{data.label || 'Trigger'}</span>
                <button className="text-xs px-2 py-0.5 border rounded" onClick={onDelete} type="button" aria-label="Delete trigger">
                    <Trash2 size={16} />
                </button>
            </div>

            <div className="p-2 space-y-3">
                <div>
                    <label className="text-sm text-gray-700">Trigger type</label>
                    <select
                        className="w-full mt-1 border rounded px-2 py-1 bg-white text-gray-800"
                        value={data.triggerType}
                        onChange={(e) => setTriggerType(e.target.value)}
                    >
                        <option value="">Select trigger...</option>
                        {triggers.map((t) => (
                            <option key={t.type} value={t.type}>{t.name || t.type}</option>
                        ))}
                    </select>
                </div>

                <div className="border-t pt-2">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold">Parameters</span>
                        <button className="text-xs px-2 py-0.5 border rounded" onClick={addParam} type="button" title="Add extra parameter">
                            <PlusCircle size={16} />
                        </button>
                    </div>
                    <div className="space-y-1">
                        {data.parameters.map((p, idx) => {
                            const def = metaParamMap.get(p.key);
                            const isMeta = Boolean(def);
                            const required = def?.required;
                            return (
                                <div key={`${p.key}-${idx}`} className="flex gap-1 items-center">
                                    <input
                                        className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800 disabled:bg-gray-100"
                                        placeholder="key"
                                        value={p.key}
                                        onChange={(e) => setParam(idx, { key: e.target.value })}
                                        disabled={isMeta}
                                        title={isMeta ? 'Defined by trigger metadata' : 'Custom parameter key'}
                                    />
                                    {renderValueInput(p, idx)}
                                    <button
                                        className="px-2 border rounded text-xs disabled:opacity-50"
                                        onClick={() => removeParam(idx)}
                                        type="button"
                                        aria-label="Remove parameter"
                                        disabled={!!required}
                                        title={required ? 'Required by metadata' : 'Remove parameter'}
                                    >
                                        ×
                                    </button>
                                </div>
                            );
                        })}
                        {data.parameters.length === 0 && (
                            <p className="text-xs text-gray-400 text-center">No parameters</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TriggerNode;