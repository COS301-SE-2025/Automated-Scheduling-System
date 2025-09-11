import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { PlusCircle, Trash2 } from 'lucide-react';
import type { ActionsNodeData, ActionRow, ParamKV } from '../../types/rule.types';
import { useRulesMetadata } from '../../contexts/RulesMetadataContext';

const ActionsNode: React.FC<NodeProps<ActionsNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();
    const { actions, byAction } = useRulesMetadata();

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

    const setActionType = (idx: number, type: string) => {
        const meta = byAction.get(type);
        const params: ParamKV[] = meta ? meta.parameters.map((p) => ({ key: p.name, value: '' })) : [];
        setAction(idx, { type, parameters: params });
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

    const valueInput = (metaParamType?: string, value = '', onChange?: (v: string) => void, options?: any[]) => {
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

        // Handle options dropdown (similar to TriggerNode)
        if (options && options.length > 0) {
            return (
                <select
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    {...stopAll}
                >
                    <option value="">Select…</option>
                    {options.map((opt, i) => {
                        const val = String(opt);
                        return <option key={`opt-${i}`} value={val}>{val}</option>;
                    })}
                </select>
            );
        }

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
        if (type === 'text_area') {
            return (
                <textarea
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800 resize-y min-h-[60px]"
                    placeholder="Enter text..."
                    value={value}
                    onChange={(e) => onChange?.(e.target.value)}
                    {...stopAll}
                    rows={3}
                />
            );
        }
        if (type === 'employees') {
            // Parse the value as JSON array of employee numbers if possible, otherwise treat as empty
            let selectedEmployees: string[] = [];
            try {
                if (value && value.trim() !== '') {
                    selectedEmployees = JSON.parse(value);
                }
            } catch {
                selectedEmployees = [];
            }

            return (
                <div className="w-1/2 flex items-center gap-2">
                    <button
                        type="button"
                        className="px-3 py-1 border rounded bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open employee selector modal with current value
                            let currentEmployeeNumbers: string[] = [];
                            try {
                                if (value && value.trim() !== '') {
                                    currentEmployeeNumbers = JSON.parse(value);
                                }
                            } catch {
                                currentEmployeeNumbers = [];
                            }
                            
                            // Dispatch custom event to open modal at page level
                            window.dispatchEvent(new CustomEvent('employees:open-selector', {
                                detail: {
                                    currentValue: currentEmployeeNumbers,
                                    onChange: onChange || (() => {})
                                }
                            }));
                        }}
                        {...stopAll}
                    >
                        Select Employees
                    </button>
                    <span className="text-sm text-gray-600 cursor-pointer hover:underline">
                        {selectedEmployees.length > 0
                            ? `${selectedEmployees.length} employee${selectedEmployees.length === 1 ? '' : 's'} selected`
                            : 'No employees selected'}
                    </span>
                    {selectedEmployees.length > 0 && (
                        <button
                            type="button"
                            aria-label="Clear employee selections"
                            title="Clear selections"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange?.('[]');
                            }}
                            className="text-gray-400 hover:text-red-600"
                            {...stopAll}
                        >
                            ×
                        </button>
                    )}
                </div>
            );
        }
        if (type === 'event_type') {
            // Parse the value as a single event ID if possible, otherwise treat as empty
            let selectedEventId: string = '';
            try {
                if (value && value.trim() !== '') {
                    selectedEventId = String(value);
                }
            } catch {
                selectedEventId = '';
            }

            return (
                <div className="w-1/2 flex items-center gap-2">
                    <button
                        type="button"
                        className="px-3 py-1 border rounded bg-green-50 hover:bg-green-100 text-green-700 text-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open event type selector modal with current value
                            let currentEventId: string = '';
                            try {
                                if (value && value.trim() !== '') {
                                    currentEventId = String(value);
                                }
                            } catch {
                                currentEventId = '';
                            }
                            
                            // Dispatch custom event to open modal at page level
                            window.dispatchEvent(new CustomEvent('event-type:open-selector', {
                                detail: {
                                    currentValue: currentEventId,
                                    onChange: onChange || (() => {})
                                }
                            }));
                        }}
                        {...stopAll}
                    >
                        Select Event Type
                    </button>
                    <span className="text-sm text-gray-600 cursor-pointer hover:underline">
                        {selectedEventId
                            ? `Event ID: ${selectedEventId}`
                            : 'No event type selected'}
                    </span>
                    {selectedEventId && (
                        <button
                            type="button"
                            aria-label="Clear event type selection"
                            title="Clear selection"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange?.('');
                            }}
                            className="text-gray-400 hover:text-red-600"
                            {...stopAll}
                        >
                            ×
                        </button>
                    )}
                </div>
            );
        }
        if (type === 'job_positions') {
            // Parse the value as JSON array of position codes if possible, otherwise treat as empty
            let selectedPositions: string[] = [];
            try {
                if (value && value.trim() !== '') {
                    selectedPositions = JSON.parse(value);
                }
            } catch {
                selectedPositions = [];
            }

            return (
                <div className="w-1/2 flex items-center gap-2">
                    <button
                        type="button"
                        className="px-3 py-1 border rounded bg-purple-50 hover:bg-purple-100 text-purple-700 text-sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            // Open job position selector modal with current value
                            let currentPositionCodes: string[] = [];
                            try {
                                if (value && value.trim() !== '') {
                                    currentPositionCodes = JSON.parse(value);
                                }
                            } catch {
                                currentPositionCodes = [];
                            }
                            
                            // Dispatch custom event to open modal at page level
                            window.dispatchEvent(new CustomEvent('job-positions:open-selector', {
                                detail: {
                                    currentValue: currentPositionCodes,
                                    onChange: onChange || (() => {})
                                }
                            }));
                        }}
                        {...stopAll}
                    >
                        Select Job Positions
                    </button>
                    <span className="text-sm text-gray-600 cursor-pointer hover:underline">
                        {selectedPositions.length > 0
                            ? `${selectedPositions.length} position${selectedPositions.length === 1 ? '' : 's'} selected`
                            : 'No positions selected'}
                    </span>
                    {selectedPositions.length > 0 && (
                        <button
                            type="button"
                            aria-label="Clear position selections"
                            title="Clear selections"
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange?.('[]');
                            }}
                            className="text-gray-400 hover:text-red-600"
                            {...stopAll}
                        >
                            ×
                        </button>
                    )}
                </div>
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
                    {data.actions.map((a, aIdx) => {
                        const meta = byAction.get(a.type);
                        const metaParamMap = new Map((meta?.parameters || []).map((p) => [p.name, p]));
                        return (
                            <div key={aIdx} className="border rounded p-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <label className="text-sm text-gray-700">Type</label>
                                    <select
                                        className="flex-1 border rounded px-2 py-1 bg-white text-gray-800"
                                        value={a.type}
                                        onChange={(e) => setActionType(aIdx, e.target.value)}
                                    >
                                        <option value="">Select action...</option>
                                        {actions.map((t) => (
                                            <option key={t.type} value={t.type}>{t.name || t.type}</option>
                                        ))}
                                    </select>
                                    <button className="px-2 border rounded text-xs" onClick={() => removeAction(aIdx)} type="button" aria-label="Remove action">
                                        ×
                                    </button>
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-sm font-semibold">Parameters</span>
                                        <button className="text-xs px-2 py-0.5 border rounded" onClick={() => addParam(aIdx)} type="button" title="Add extra parameter">
                                            + Add
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {a.parameters.map((p, pIdx) => {
                                            const def = metaParamMap.get(p.key);
                                            const required = def?.required;
                                            const options = (def as any)?.options as any[] | undefined;
                                            return (
                                                <div key={`${p.key}-${pIdx}`} className="flex gap-1 items-center">
                                                    <input
                                                        className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800 disabled:bg-gray-100"
                                                        placeholder="key"
                                                        value={p.key}
                                                        onChange={(e) => setParam(aIdx, pIdx, { key: e.target.value })}
                                                        disabled={!!def}
                                                        title={def ? 'Defined by action metadata' : 'Custom parameter key'}
                                                    />
                                                    {valueInput(def?.type, p.value, (v) => setParam(aIdx, pIdx, { value: v }), options)}
                                                    <button
                                                        className="px-2 border rounded text-xs disabled:opacity-50"
                                                        onClick={() => removeParam(aIdx, pIdx)}
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
                                        {a.parameters.length === 0 && (
                                            <p className="text-xs text-gray-400 text-center">No parameters</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {data.actions.length === 0 && (
                        <p className="text-xs text-gray-400 text-center">No actions</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActionsNode;