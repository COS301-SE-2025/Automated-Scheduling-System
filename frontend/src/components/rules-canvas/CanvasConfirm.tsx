import { useEffect, useState } from 'react';

type Detail = { id: string; name?: string };

export default function CanvasConfirm() {
    const [pending, setPending] = useState<Detail | null>(null);

    useEffect(() => {
        const open = (e: Event) => {
            const d = (e as CustomEvent<Detail>).detail;
            setPending(d);
        };
        window.addEventListener('rule:confirm-delete', open as any);
        return () => window.removeEventListener('rule:confirm-delete', open as any);
    }, []);

    if (!pending) return null;
    const close = () => setPending(null);
    const confirm = () => {
        window.dispatchEvent(new CustomEvent('rule:delete-confirmed', { detail: { id: pending.id } }));
        setPending(null);
    };

    return (
        <div className="absolute inset-0 z-[2200]">
            <div className="absolute inset-0 bg-black/30 dark:bg-black/50" onClick={close} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 
                            bg-white dark:bg-gray-900 rounded shadow-lg w-[380px] border border-gray-200 dark:border-gray-700">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">Delete rule</h3>
                </div>
                <div className="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                    Are you sure you want to permanently delete “{pending.name || 'Rule'}”? This cannot be undone.
                </div>
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
                    <button
                        className="px-3 py-1 border rounded text-sm text-gray-800 bg-white hover:bg-gray-50 
                                   border-gray-300 dark:text-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600"
                        onClick={close}
                        type="button"
                    >
                        Cancel
                    </button>
                    <button
                        className="px-3 py-1 rounded text-sm bg-red-600 hover:bg-red-700 text-white"
                        onClick={confirm}
                        type="button"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
}