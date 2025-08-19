import { useEffect, useState } from 'react';

type SavedDetail = { id: string; name?: string };

export default function CanvasToast() {
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<SavedDetail>).detail;
            const name = detail?.name || 'Rule';
            setMsg(`${name} saved`);
            const t = setTimeout(() => setMsg(null), 1600);
            return () => clearTimeout(t);
        };
        window.addEventListener('rule:saved', handler as any);
        return () => window.removeEventListener('rule:saved', handler as any);
    }, []);

    if (!msg) return null;
    return (
        <div className="absolute top-3 left-3 z-[2100] pointer-events-none">
            <div className="bg-emerald-50 text-black text-xs px-3 py-2 rounded shadow pointer-events-auto
                            dark:bg-emerald-600 dark:text-white">
                {msg}
            </div>
        </div>
    );
}