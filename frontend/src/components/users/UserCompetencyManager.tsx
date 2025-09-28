import React, { useEffect, useState, useMemo } from 'react';
import { PlusCircle, Trash2, Edit3, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import Button from '../ui/Button';
import GenericSelectModal from '../ui/GenericSelectModal';
import EditEmployeeCompetencyModal from './EditEmployeeCompetencyModal';
import type { Competency } from '../../types/competency';
import type { EmployeeCompetency } from '../../types/employeeCompetency';
import * as ecService from '../../services/employeeCompetencyService';

interface Props {
    employeeNumber: string;
    allCompetencies: Competency[];
}

const UserCompetencyManager: React.FC<Props> = ({ employeeNumber, allCompetencies }) => {
    const [loading, setLoading] = useState(true);
    const [rows, setRows] = useState<EmployeeCompetency[]>([]);
    const [error, setError] = useState<string | null>(null);

    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<EmployeeCompetency | null>(null);
    const [editBusy, setEditBusy] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ecService.getEmployeeCompetencies(employeeNumber);
            setRows(data);
        } catch (e: any) {
            setError(e?.data?.error || e.message || 'Failed to load competencies.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refresh();
    }, [employeeNumber]);

    const existingCompetencyIDs = new Set(rows.map(r => r.competencyID));
    const addableCompetencies = useMemo(
        () => allCompetencies.filter(c => !existingCompetencyIDs.has(c.competencyID)),
        [allCompetencies, existingCompetencyIDs]
    );

    const statusInfo = (r: EmployeeCompetency) => {
        const today = new Date();
        if (!r.achievementDate) {
            return { label: 'Required', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300', icon: <Clock size={14} /> };
        }
        if (r.expiryDate && new Date(r.expiryDate) < today) {
            return { label: 'Expired', color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle size={14} /> };
        }
        return { label: 'Achieved', color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle2 size={14} /> };
    };

    const addCompetencies = async (ids: string[]) => {
        if (!ids.length) return;
        setLoading(true);
        try {
            for (const idStr of ids) {
                const compID = parseInt(idStr, 10);
                // Create as "Required" (no achievementDate)
                await ecService.createEmployeeCompetency({
                    employeeNumber,
                    competencyID: compID
                });
            }
            await refresh();
        } catch (e: any) {
            setError(e?.data?.error || 'Failed to add competency.');
        } finally {
            setLoading(false);
            setShowAdd(false);
        }
    };

    const removeRow = async (id: number) => {
        if (!confirm('Remove this competency record?')) return;
        try {
            await ecService.deleteEmployeeCompetency(id);
            setRows(prev => prev.filter(r => r.employeeCompetencyID !== id));
        } catch (e: any) {
            alert(e?.data?.error || 'Delete failed.');
        }
    };

    const saveEdit = async (updates: { achievementDate?: string | null; expiryDate?: string | null; notes?: string | null; }) => {
        if (!editTarget) return;
        setEditBusy(true);
        setEditError(null);
        try {
            await ecService.updateEmployeeCompetency(editTarget.employeeCompetencyID, {
                achievementDate: updates.achievementDate ?? undefined,
                expiryDate: updates.expiryDate ?? undefined,
                notes: updates.notes ?? undefined
            });
            await refresh();
            setEditTarget(null);
        } catch (e: any) {
            setEditError(e?.data?.error || e.message || 'Update failed.');
        } finally {
            setEditBusy(false);
        }
    };

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-custom-primary dark:text-dark-primary">
                    Competencies for {employeeNumber}
                </h4>
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAdd(true)}
                    disabled={addableCompetencies.length === 0 || loading}
                >
                    <span className="flex items-center">
                        <PlusCircle size={16} className="mr-1" />
                        <span>Add</span>
                    </span>
                </Button>
            </div>
            {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
            {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No competencies linked.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border rounded">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-3 py-2 text-left">Name</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Achievement</th>
                                <th className="px-3 py-2 text-left">Expiry</th>
                                <th className="px-3 py-2 text-left">Notes</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {rows.map(r => {
                                const s = statusInfo(r);
                                return (
                                    <tr key={r.employeeCompetencyID} className="bg-white dark:bg-dark-input">
                                        <td className="px-3 py-2">
                                            {r.competencyDefinition?.competencyName || `#${r.competencyID}`}
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
                                                {s.icon}{s.label}
                                            </span>
                                        </td>
                                        <td className="px-3 py-2">{r.achievementDate ? r.achievementDate.substring(0, 10) : '—'}</td>
                                        <td className="px-3 py-2">{r.expiryDate ? r.expiryDate.substring(0, 10) : '—'}</td>
                                        <td className="px-3 py-2 truncate max-w-[200px]" title={r.notes}>{r.notes || '—'}</td>
                                        <td className="px-3 py-2 text-right space-x-2">
                                            <button
                                                className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary"
                                                onClick={() => setEditTarget(r)}
                                                title="Edit"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                className="text-red-600 hover:text-red-700"
                                                onClick={() => removeRow(r.employeeCompetencyID)}
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <GenericSelectModal
                isOpen={showAdd}
                title="Add Competencies (mark as Required)"
                items={addableCompetencies}
                idKey="competencyID"
                columns={[
                    { header: 'Name', field: 'competencyName' },
                    { header: 'Type', field: 'competencyTypeName', className: 'text-gray-500' },
                    { header: 'Expiry (Months)', field: 'expiryPeriodMonths', className: 'text-gray-500' }
                ]}
                searchFields={['competencyName', 'competencyTypeName'] as any}
                onClose={() => setShowAdd(false)}
                onConfirm={addCompetencies}
                multiSelect
                footerPrimaryLabel="Add Selected"
            />

            <EditEmployeeCompetencyModal
                isOpen={!!editTarget}
                competency={editTarget}
                onClose={() => { if (!editBusy) { setEditTarget(null); setEditError(null); } }}
                onSave={saveEdit}
                isBusy={editBusy}
                error={editError}
            />
        </div>
    );
};

export default UserCompetencyManager;