import React, { useState, useEffect } from 'react';
import Button from '../ui/Button';
import type { EmployeeCompetency } from '../../types/employeeCompetency';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    competency: EmployeeCompetency | null;
    onSave: (updates: {
        achievementDate?: string | null;
        expiryDate?: string | null;
        notes?: string | null;
    }) => Promise<void>;
    isBusy?: boolean;
    error?: string | null;
}

const fmt = (d?: string | null) => (d ? d.substring(0, 10) : '');

const EditEmployeeCompetencyModal: React.FC<Props> = ({
    isOpen, onClose, competency, onSave, isBusy, error
}) => {
    const [achievementDate, setAchievementDate] = useState<string>('');
    const [expiryDate, setExpiryDate] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    const [clearAchievement, setClearAchievement] = useState(false);
    const [clearExpiry, setClearExpiry] = useState(false);

    useEffect(() => {
        if (isOpen && competency) {
            setAchievementDate(fmt(competency.achievementDate));
            setExpiryDate(fmt(competency.expiryDate));
            setNotes(competency.notes || '');
            setClearAchievement(false);
            setClearExpiry(false);
        }
    }, [isOpen, competency]);

    if (!isOpen || !competency) return null;

    const submit = async () => {
        await onSave({
            achievementDate: clearAchievement ? null : (achievementDate || undefined),
            expiryDate: clearExpiry ? null : (expiryDate || undefined),
            notes
        });
    };

    return (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
            <div className="bg-white dark:bg-dark-div rounded-md w-full max-w-lg shadow-lg">
                <div className="px-4 py-3 border-b dark:border-gray-700 flex justify-between items-center">
                    <h3 className="font-semibold text-custom-primary dark:text-dark-primary text-sm">
                        Edit Competency: {competency.competencyDefinition?.competencyName || competency.competencyID}
                    </h3>
                    <button onClick={onClose} className="text-sm px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700">✕</button>
                </div>
                <div className="p-4 space-y-4">
                    {error && <div className="text-xs text-red-600">{error}</div>}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <label className="text-xs flex flex-col gap-1">
                            Achievement Date
                            <input
                                type="date"
                                value={achievementDate}
                                onChange={e => { setAchievementDate(e.target.value); setClearAchievement(false); }}
                                disabled={clearAchievement}
                                className="border rounded p-2 text-sm dark:bg-dark-input"
                            />
                            <div className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={clearAchievement}
                                    onChange={e => setClearAchievement(e.target.checked)}
                                />
                                <span className="select-none">Set to Required (no achievement)</span>
                            </div>
                        </label>
                        <label className="text-xs flex flex-col gap-1">
                            Expiry Date
                            <input
                                type="date"
                                value={expiryDate}
                                onChange={e => { setExpiryDate(e.target.value); setClearExpiry(false); }}
                                disabled={clearExpiry}
                                className="border rounded p-2 text-sm dark:bg-dark-input"
                            />
                            <div className="flex items-center gap-1 text-xs">
                                <input
                                    type="checkbox"
                                    checked={clearExpiry}
                                    onChange={e => setClearExpiry(e.target.checked)}
                                />
                                <span className="select-none">Clear expiry</span>
                            </div>
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
                    <Button type="button" variant="outline" onClick={onClose} disabled={isBusy}>Cancel</Button>
                    <Button type="button" variant="primary" onClick={submit} disabled={isBusy}>
                        {isBusy ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EditEmployeeCompetencyModal;