//frontend/src/components/rules-canvas/RuleNode.tsx
import React from 'react';
import { Handle, Position, type NodeProps, useReactFlow, type Connection } from 'reactflow';
import { Trash2 } from 'lucide-react';
import type { RuleNodeData } from '../../types/rule.types';

const RuleNode: React.FC<NodeProps<RuleNodeData>> = ({ id, data }) => {
    const rf = useReactFlow();
    const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        rf.setNodes((nds) => nds.map((n) => (n.id === id ? { ...n, data: { ...data, label: name, name } } : n)));
    };
    const onDelete = () => rf.deleteElements({ nodes: [{ id }] });

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

    return (
        <div className="bg-white border-2 border-blue-300 rounded-md shadow-md w-64 text-gray-800">
            <Handle type="target" position={Position.Top} isValidConnection={validIfRule} />
            <Handle type="source" position={Position.Bottom} isValidConnection={validIfRule} />
            <div className="bg-blue-50 p-2 font-semibold rounded-t-md flex items-center justify-between">
                <span>Rule</span>
                <button className="text-xs px-2 py-0.5 border rounded" onClick={onDelete} type="button" aria-label="Delete rule">
                    <Trash2 size={16} />
                </button>
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