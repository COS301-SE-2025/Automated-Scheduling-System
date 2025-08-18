import React, { useMemo } from 'react';
import { useReactFlow, useStore } from 'reactflow';
import { ArrowLeft, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';

type Side = 'left' | 'right' | 'top' | 'bottom';

type ArrowItem = {
    id: string;
    side: Side;
    pos: number;
    label?: string;
};

export default function CanvasNavigator() {
    const rf = useReactFlow();
    const { transform, width, height, nodeInternals } = useStore((s) => ({
        transform: s.transform,
        width: s.width,
        height: s.height,
        nodeInternals: s.nodeInternals,
    }));

    const rules = useMemo(() => {
        return Array.from(nodeInternals.values()).filter((n) => n.type === 'rule');
    }, [nodeInternals]);

    const arrows = useMemo<ArrowItem[]>(() => {
        const [tx, ty, z] = transform;
        const pad = 12;
        const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

        const items: ArrowItem[] = [];

        for (const n of rules) {
            const nx = n.positionAbsolute?.x ?? n.position.x;
            const ny = n.positionAbsolute?.y ?? n.position.y;
            const w = n.width ?? 150;
            const h = n.height ?? 60;

            const cx = (nx + w / 2) * z + tx;
            const cy = (ny + h / 2) * z + ty;

            const inside = cx >= 0 && cx <= width && cy >= 0 && cy <= height;
            if (inside) continue;

            const overflowLeft = 0 - cx;
            const overflowRight = cx - width;
            const overflowTop = 0 - cy;
            const overflowBottom = cy - height;

            let side: Side;
            let pos: number;

            if (cx < 0 || cx > width) {
                if (cx < 0) side = 'left';
                else side = 'right';
                pos = clamp(cy, pad, height - pad);
            } else {
                if (cy < 0) side = 'top';
                else side = 'bottom';
                pos = clamp(cx, pad, width - pad);
            }

            if (!inside && (cx < 0 || cx > width) && (cy < 0 || cy > height)) {
                const horiz = Math.max(overflowLeft, overflowRight);
                const vert = Math.max(overflowTop, overflowBottom);
                if (horiz >= vert) {
                    side = cx < 0 ? 'left' : 'right';
                    pos = clamp(cy, pad, height - pad);
                } else {
                    side = cy < 0 ? 'top' : 'bottom';
                    pos = clamp(cx, pad, width - pad);
                }
            }

            items.push({
                id: n.id,
                side,
                pos,
                label: (n.data as any)?.name || (n.data as any)?.label || 'Rule',
            });
        }

        const buckets = new Map<string, ArrowItem[]>();
        items.forEach((it) => {
            const key = `${it.side}:${Math.round(it.pos / 16)}`;
            const arr = buckets.get(key) ?? [];
            arr.push(it);
            buckets.set(key, arr);
        });
        buckets.forEach((arr) => {
            arr.forEach((it, i) => {
                it.pos += i * 24;
            });
        });

        return items;
    }, [rules, transform, width, height]);

    const panTo = (id: string) => {
        const n = rf.getNode(id);
        if (!n) return;
        const x = (n.positionAbsolute?.x ?? n.position.x) + (n.width ?? 150) / 2;
        const y = (n.positionAbsolute?.y ?? n.position.y) + (n.height ?? 60) / 2;
        rf.setCenter(x, y, { duration: 400 });
    };

    const ArrowBtn = ({ it }: { it: ArrowItem }) => {
        const base =
            'absolute pointer-events-auto border rounded shadow px-2 py-1 flex items-center justify-center transition text-sm ' +
            'bg-white/95 text-gray-800 hover:bg-white ' +
            'dark:bg-gray-800/90 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-800';
        let style: React.CSSProperties = {};
        let Icon: React.FC<{ size?: number }>;
        switch (it.side) {
            case 'left':
                style = { left: 8, top: it.pos, transform: 'translateY(-50%)' };
                Icon = ArrowLeft as any;
                break;
            case 'right':
                style = { right: 8, top: it.pos, transform: 'translateY(-50%)' };
                Icon = ArrowRight as any;
                break;
            case 'top':
                style = { top: 8, left: it.pos, transform: 'translateX(-50%)' };
                Icon = ArrowUp as any;
                break;
            case 'bottom':
                style = { bottom: 8, left: it.pos, transform: 'translateX(-50%)' };
                Icon = ArrowDown as any;
                break;
        }
        return (
            <button
                className={base}
                style={style}
                onClick={() => panTo(it.id)}
                type="button"
                title={`Go to ${it.label}`}
            >
                <Icon size={16} />
            </button>
        );
    };

    return (
        <div className="absolute inset-0 z-[2000] pointer-events-none">
            {arrows.map((it) => (
                <ArrowBtn key={`${it.id}-${it.side}`} it={it} />
            ))}
        </div>
    );
}