import React from 'react';
import { useReactFlow } from 'reactflow';
import { FileText, Zap, Filter, PlayCircle, GripVertical } from 'lucide-react';

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

const Toolbox: React.FC<{ onReset?: () => void }> = ({ onReset }) => {
    const rf = useReactFlow();

    const resetCanvas = () => {
        if (window.confirm('Reset the canvas?')) {
            rf.setNodes([]);
            rf.setEdges([]);
            onReset?.();
        }
    };

    return (
        <aside className="w-full flex-none border-2 border-gray-300 dark:border-gray-600 bg-white/90 dark:bg-dark-input/90 backdrop-blur-sm">
            <div className="px-3 sm:px-4 py-3">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-lg sm:text-xl font-bold text-custom-secondary">Toolbox</h2>
                    <button
                        type="button"
                        onClick={resetCanvas}
                        title="Reset canvas"
                        className="px-3 py-1 text-xs border rounded bg-gradient-to-r from-custom-secondary/10 to-custom-third/10
                                   hover:from-custom-secondary/20 hover:to-custom-third/20 text-custom-secondary"
                    >
                        Reset canvas
                    </button>
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