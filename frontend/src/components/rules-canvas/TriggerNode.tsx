import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { Trash2 } from 'lucide-react';
import type { TriggerNodeData, ParamKV } from '../../types/rule.types';
import { useRulesMetadata } from '../../contexts/RulesMetadataContext';

const dayLabels = new Map<string, string>([
    ['1', 'Monday'],
    ['2', 'Tuesday'],
    ['3', 'Wednesday'],
    ['4', 'Thursday'],
    ['5', 'Friday'],
    ['6', 'Saturday'],
    ['7', 'Sunday'],
]);

function getVisibleParamKeys(triggerType: string, params: ParamKV[]): Set<string> {
    if (triggerType !== 'scheduled_time') return new Set(params.map(p => p.key));
    const freq = params.find(p => p.key === 'frequency')?.value || '';
    const keys = new Set<string>(['frequency']); // always show frequency
    switch (freq) {
        case 'hourly':
            keys.add('minute_of_hour'); keys.add('timezone'); break;
        case 'daily':
            keys.add('time_of_day'); keys.add('timezone'); break;
        case 'weekly':
            keys.add('day_of_week'); keys.add('time_of_day'); keys.add('timezone'); break;
        case 'monthly':
            keys.add('day_of_month'); keys.add('time_of_day'); keys.add('timezone'); break;
        case 'once':
            keys.add('date'); keys.add('time_of_day'); keys.add('timezone'); break;
        case 'cron':
            keys.add('cron_expression'); keys.add('timezone'); break;
        default:
            break;
    }
    return keys;
}

const TriggerNode: React.FC<NodeProps<TriggerNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();
    const { triggers, byTrigger } = useRulesMetadata();

    const update = React.useCallback((partial: Partial<TriggerNodeData>) => {
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
    }, [id, rf]);

    const setTriggerType = (newType: string) => {
        const meta = byTrigger.get(newType);
        const params: ParamKV[] = meta
            ? meta.parameters.map((p) => {
                  const firstOpt = (p as any).options?.length ? String((p as any).options[0]) : '';
                  return { key: p.name, value: firstOpt };
              })
            : [];
        update({ triggerType: newType, parameters: params });
    };

    const setParam = (idx: number, patch: Partial<ParamKV>) => {
        const next = data.parameters.map((p, i) => (i === idx ? { ...p, ...patch } : p));
        update({ parameters: next });
    };
    // const setParamByKey = (key: string, value: string) => {
    //     const idx = data.parameters.findIndex(p => p.key === key);
    //     if (idx >= 0) setParam(idx, { value });
    //     else update({ parameters: [...data.parameters, { key, value }] });
    // };
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
    const metaParamMap = new Map((meta?.parameters || []).map((p) => [p.name, p as any]));
    const visibleKeys = getVisibleParamKeys(data.triggerType, data.parameters);

    // Map of date_field options per entity_type for relative_time
    const relativeDateFields: Record<string, string[]> = React.useMemo(() => ({
        scheduled_event: ['event_start_date', 'event_end_date'],
        employee_competency: ['expiry_date'],
        employee: ['termination_date'],
        employment_history: ['start_date'],
    }), []);

    // Ensure required keys for scheduled_time AFTER render to avoid setState in render.
    React.useEffect(() => {
        if (data.triggerType !== 'scheduled_time') return;

        const metaLocal = byTrigger.get(data.triggerType);
        const defMap = new Map((metaLocal?.parameters || []).map((p) => [p.name, p as any]));

        const keysToEnsure = getVisibleParamKeys(data.triggerType, data.parameters);
        const missing: ParamKV[] = [];
        for (const k of keysToEnsure) {
            if (!data.parameters.some(p => p.key === k)) {
                const def = defMap.get(k);
                const firstOpt = def?.options?.length ? String(def.options[0]) : (k === 'timezone' ? 'UTC+0' : '');
                missing.push({ key: k, value: firstOpt });
            }
        }
        if (missing.length > 0) {
            update({ parameters: [...data.parameters, ...missing] });
        }
}, [data.triggerType, data.parameters, byTrigger, update])

    const renderValueInput = (p: ParamKV, idx: number) => {
        const def = metaParamMap.get(p.key);
        const type = def?.type || 'string';
        const required = def?.required;
        let options = (def as any)?.options as any[] | undefined;
        const placeholder = `${type}${required ? ' • required' : ''}`;

        const stopAll = {
            onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
            onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
            onWheel: (e: React.WheelEvent) => { e.preventDefault(); e.stopPropagation(); },
            onKeyDown: (e: React.KeyboardEvent) => {
                if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    e.stopPropagation();
                }
            },
        };

        // Dynamically narrow date_field options for relative_time based on entity_type
        if (data.triggerType === 'relative_time' && p.key === 'date_field') {
            const et = data.parameters.find(x => x.key === 'entity_type')?.value as string || '';
            if (et && relativeDateFields[et]) {
                options = relativeDateFields[et];
            }
        }

        // Dropdowns from options (supports numeric and string lists)
        if (options && options.length > 0) {
            const isDOW = data.triggerType === 'scheduled_time' && p.key === 'day_of_week';
            return (
                <select
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                    {...stopAll}
                >
                    <option value="">{required ? 'Select…' : '—'}</option>
                    {options.map((opt, i) => {
                        const val = String(opt);
                        const label = isDOW ? (dayLabels.get(val) ?? val) : val;
                        return <option key={`${p.key}-opt-${i}`} value={val}>{label}</option>;
                    })}
                </select>
            );
        }

        if (type === 'boolean') {
            return (
                <select
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                    {...stopAll}
                >
                    <option value="">{required ? 'Select…' : '—'}</option>
                    <option value="true">true</option>
                    <option value="false">false</option>
                </select>
            );
        }
        if (type === 'number' || type === 'integer') {
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder={placeholder}
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                    {...stopAll}
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
                    {...stopAll}
                />
            );
        }
        if (type === 'time') {
            return (
                <input
                    className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                    type="time"
                    placeholder={placeholder}
                    value={p.value}
                    onChange={(e) => setParam(idx, { value: e.target.value })}
                    {...stopAll}
                />
            );
        }
        return (
            <input
                className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800"
                placeholder={placeholder}
                value={p.value}
                onChange={(e) => setParam(idx, { value: e.target.value })}
                onPointerDown={(e) => e.stopPropagation()}
                onWheel={(e) => e.stopPropagation()}
            />
        );
    };

    const onParamKeyChange = (idx: number, nextKey: string) => {
        setParam(idx, { key: nextKey });
    };

    const frequency = data.parameters.find(p => p.key === 'frequency')?.value || '';

    return (
        <div
            className="bg-white border-2 border-amber-300 rounded-md shadow-md w-[34rem] md:w-[40rem] text-gray-800"
            onMouseDown={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onWheel={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
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
                        {data.triggerType === 'scheduled_time' && (
                            <span className="text-xs text-gray-500">
                                {frequency ? `Showing fields for “${frequency}”` : 'Select frequency'}
                            </span>
                        )}
                    </div>
                    <div className="space-y-1">
                        {data.parameters
                            .map((p, originalIdx) => ({ p, originalIdx }))
                            .filter(({ p }) => visibleKeys.has(p.key))
                            .map(({ p, originalIdx }) => {
                                const def = metaParamMap.get(p.key);
                                const isMeta = Boolean(def);
                                return (
                                    <div key={`${p.key}-${originalIdx}`} className="flex gap-1 items-center">
                                        <button
                                            type="button"
                                            className="w-5 h-5 rounded-full border text-xs leading-4 text-gray-700 bg-white"
                                            title={def?.description || 'No description'}
                                            onPointerDown={(e) => e.stopPropagation()}
                                            onMouseDown={(e) => e.stopPropagation()}
                                        >
                                            ?
                                        </button>
                                        <input
                                            className="w-1/2 border rounded px-2 py-1 bg-white text-gray-800 disabled:bg-gray-100"
                                            placeholder="key"
                                            value={p.key}
                                            onChange={(e) => onParamKeyChange(originalIdx, e.target.value)}
                                            disabled={isMeta}
                                            title={isMeta ? 'Defined by trigger metadata' : 'Custom parameter key'}
                                        />
                                        {renderValueInput(p, originalIdx)}
                                        <button
                                            className="px-2 border rounded text-xs disabled:opacity-50"
                                            onClick={() => removeParam(originalIdx)}
                                            type="button"
                                            aria-label="Remove parameter"
                                            disabled={isMeta}
                                            title={isMeta ? 'Defined by trigger metadata' : 'Remove parameter'}
                                        >
                                            ×
                                        </button>
                                    </div>
                                );
                            })}
                        {data.parameters.filter(p => visibleKeys.has(p.key)).length === 0 && (
                            <p className="text-xs text-gray-400 text-center">No parameters</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TriggerNode;