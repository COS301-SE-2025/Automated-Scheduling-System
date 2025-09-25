import React, { useEffect, useState } from 'react';
import Button from '../ui/Button';
import type { EmploymentHistory } from '../../types/employmentHistory';

interface Props {
    isOpen: boolean;
    record: EmploymentHistory | null;
    onClose: () => void;
    onSave: (updates: { endDate?: string | null; employmentType?: string; notes?: string | null }) => Promise<void>;
    isBusy?: boolean;
    error?: string | null;
}

const EditEmploymentHistoryModal: React.FC<Props> = ({ isOpen, record, onClose, onSave, isBusy, error }) => {
    const [endDate, setEndDate] = useState('');
    const [closeNow, setCloseNow] = useState(false);
    const [employmentType, setEmploymentType] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && record) {
            setEndDate(record.endDate ? record.endDate.substring(0, 10) : '');
            setEmploymentType(record.employmentType || '');
            setNotes(record.notes || '');
            setCloseNow(false);
        }
    }, [isOpen, record]);

    if (!isOpen || !record) return null;

    const submit = async () => {
        await onSave({
            endDate: closeNow ? new Date().toISOString().substring(0, 10) : (endDate || undefined),
            employmentType: employmentType || undefined,
            notes
        });
    };

    const isCurrent = !record.endDate;

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-dark-div rounded-md w-full max-w-lg shadow-lg">
                <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-custom-primary dark:text-dark-primary text-sm">
                        Edit Position: {record.positionMatrixCode}
                    </h3>
                    <button onClick={onClose} className="text-sm px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">✕</button>
                </div>
                <div className="p-4 space-y-4">
                    {error && <div className="text-xs text-red-600">{error}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-xs flex flex-col gap-1">
                            Employment Type
                            <input
                                type="text"
                                value={employmentType}
                                onChange={e => setEmploymentType(e.target.value)}
                                className="border rounded p-2 text-sm dark:bg-dark-input"
                            />
                        </label>
                        <label className="text-xs flex flex-col gap-1">
                            End Date
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => { setEndDate(e.target.value); setCloseNow(false); }}
                                disabled={closeNow}
                                className="border rounded p-2 text-sm dark:bg-dark-input"
                            />
                            {isCurrent && (
                                <div className="flex items-center gap-1 text-xs">
                                    <input
                                        type="checkbox"
                                        checked={closeNow}
                                        onChange={e => setCloseNow(e.target.checked)}
                                    />
                                    <span>Set to today (close)</span>
                                </div>
                            )}
                        </label>
                    </div>
                    <label className="text-xs flex flex-col gap-1">
                        Notes
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            className="border rounded p-2 text-sm resize-y dark:bg-dark-input"
                        />
                    </label>
                </div>
                <div className="px-4 py-3 border-t dark:border-gray-700 flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={onClose} disabled={isBusy}>Cancel</Button>
                    <Button variant="primary" type="button" onClick={submit} disabled={isBusy}>
                        {isBusy ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditEmploymentHistoryModal;