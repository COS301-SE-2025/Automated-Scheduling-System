import React, { useEffect, useState } from 'react';
import { useReactFlow } from 'reactflow';
import { FileText, Zap, Filter, PlayCircle, GripVertical } from 'lucide-react';
import { loadRuleLibrary, type StoredRuleRecord } from '../../utils/canvasStorage';

const palette: Record<string, { bar: string; ring: string }> = {
    rule: { bar: 'bg-blue-300', ring: 'hover:ring-blue-200/60' },
    trigger: { bar: 'bg-amber-300', ring: 'hover:ring-amber-200/60' },
    conditions: { bar: 'bg-emerald-300', ring: 'hover:ring-emerald-200/60' },
    actions: { bar: 'bg-violet-300', ring: 'hover:ring-violet-200/60' },
};

type ItemType = 'rule' | 'trigger' | 'conditions' | 'actions';
const typeIcon: Record<ItemType, React.ComponentType<{ className?: string; size?: number }>> = {
    rule: FileText,
    trigger: Zap,
    conditions: Filter,
    actions: PlayCircle,
};

const ToolboxItem = ({ type, label }: { type: ItemType; label: string }) => {
    const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };
    const p = palette[type];
    const Icon = typeIcon[type];

    return (
        <div
            className={`group p-3 border border-gray-200 rounded-md bg-white cursor-grab text-left shadow-sm hover:shadow-md transition-all
                        hover:-translate-y-0.5 ring-1 ring-transparent ${p.ring} w-66`}
            onDragStart={(event) => onDragStart(event, type)}
            draggable
        >
            <div className={`h-1 rounded -mt-3 -mx-3 mb-2 ${p.bar}`} />
            <div className="flex items-center">
                <Icon className="w-4 h-4 text-gray-500 mr-2" />
                <span className="font-semibold text-base text-custom-primary">{label}</span>
                <div className="ml-auto flex items-center text-xs text-gray-400 group-hover:text-gray-600">
                    <GripVertical className="w-4 h-4 mr-1" />
                    <span>Drag and drop</span>
                </div>
            </div>
        </div>
    );
};

const Toolbox: React.FC = () => {
    const rf = useReactFlow();
    const [rules, setRules] = useState<StoredRuleRecord[]>([]);

    useEffect(() => {
        const refresh = () => setRules(loadRuleLibrary());
        refresh();
        const onSaved = () => refresh();
        const onDeleted = () => refresh();
        window.addEventListener('rule:saved', onSaved as any);
        window.addEventListener('rule:delete-confirmed', onDeleted as any);
        return () => {
            window.removeEventListener('rule:saved', onSaved as any);
            window.removeEventListener('rule:delete-confirmed', onDeleted as any);
        };
    }, []);

    const gotoRule = (ruleId: string) => {
        if (!ruleId) return;
        const n = rf.getNode(ruleId);
        if (!n) return;
        const x = (n.positionAbsolute?.x ?? n.position.x) + (n.width ?? 150) / 2;
        const y = (n.positionAbsolute?.y ?? n.position.y) + (n.height ?? 60) / 2;
        rf.setCenter(x, y, { duration: 400 });
    };

    return (
        <aside className="w-full flex-none border-2 border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-dark-input/90 backdrop-blur-sm">
            <div className="px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-3 gap-3">
                    <h2 className="text-lg sm:text-xl font-bold text-custom-secondary">Toolbox</h2>
                    <div className="flex items-center gap-2">
                        <select
                            className="min-w-[220px] px-2 py-1 text-xs border rounded bg-white text-custom-primary
                                       dark:bg-dark-input dark:text-dark-primary dark:border-gray-700"
                            onChange={(e) => gotoRule(e.target.value)}
                            defaultValue=""
                            title="Jump to saved rule"
                        >
                            <option value="" disabled>Jump to rule…</option>
                            {rules.map((r) => (
                                <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                    <ToolboxItem type="rule" label="Rule" />
                    <ToolboxItem type="trigger" label="Trigger Block" />
                    <ToolboxItem type="conditions" label="Conditions Block" />
                    <ToolboxItem type="actions" label="Actions Block" />
                </div>
            </div>
        </aside>
    );
};

export default Toolbox;