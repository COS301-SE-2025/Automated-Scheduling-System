import React, { useEffect, useMemo, useState } from 'react';
import { PlusCircle, Edit3, Trash2, Clock, CheckCircle2 } from 'lucide-react';
import Button from '../ui/Button';
import GenericSelectModal from '../ui/GenericSelectModal';
import EditEmploymentHistoryModal from './EditEmploymentHistoryModal';
import type { EmploymentHistory } from '../../types/employmentHistory';
import type { JobPosition } from '../../services/jobPositionService';
import * as ehService from '../../services/employmentHistoryService';

interface Props {
    employeeNumber: string;
    jobPositions: JobPosition[];
}

const UserEmploymentHistoryManager: React.FC<Props> = ({ employeeNumber, jobPositions }) => {
    const [rows, setRows] = useState<EmploymentHistory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAdd, setShowAdd] = useState(false);
    const [editTarget, setEditTarget] = useState<EmploymentHistory | null>(null);
    const [editBusy, setEditBusy] = useState(false);
    const [editError, setEditError] = useState<string | null>(null);

    const refresh = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await ehService.getEmploymentHistory(employeeNumber);
            setRows(data);
        } catch (e: any) {
            setError(e?.data?.error || e.message || 'Failed to load employment history.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { refresh(); }, [employeeNumber]);

    const currentCodes = new Set(rows.filter(r => !r.endDate).map(r => r.positionMatrixCode));
    const addablePositions = useMemo(
        () => jobPositions.filter(p => p.isActive && !currentCodes.has(p.positionMatrixCode)),
        [jobPositions, currentCodes]
    );

    const statusInfo = (r: EmploymentHistory) => {
        if (!r.endDate) return { label: 'Current', cls: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle2 size={14} /> };
        return { label: 'Past', cls: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300', icon: <Clock size={14} /> };
    };

    const addPositions = async (codes: string[]) => {
        if (!codes.length) return;
        setLoading(true);
        try {
            const today = new Date().toISOString().substring(0, 10);
            for (const c of codes) {
                await ehService.createEmploymentHistory({
                    employeeNumber,
                    positionMatrixCode: c,
                    startDate: today,
                    employmentType: 'Primary'
                });
            }
            await refresh();
        } catch (e: any) {
            setError(e?.data?.error || 'Failed to add positions.');
        } finally {
            setLoading(false);
            setShowAdd(false);
        }
    };

    const removeRow = async (id: number) => {
        if (!confirm('Delete this employment record?')) return;
        try {
            await ehService.deleteEmploymentHistory(id);
            setRows(prev => prev.filter(r => r.employmentID !== id));
        } catch (e: any) {
            alert(e?.data?.error || 'Delete failed.');
        }
    };

    const saveEdit = async (updates: { endDate?: string | null; employmentType?: string; notes?: string | null }) => {
        if (!editTarget) return;
        setEditBusy(true);
        setEditError(null);
        try {
            await ehService.updateEmploymentHistory(editTarget.employmentID, {
                endDate: updates.endDate === undefined ? undefined : updates.endDate,
                employmentType: updates.employmentType,
                notes: updates.notes
            });
            await refresh();
            setEditTarget(null);
        } catch (e: any) {
            setEditError(e?.data?.error || e.message || 'Update failed.');
        } finally {
            setEditBusy(false);
        }
    };

    const posName = (code: string) => jobPositions.find(p => p.positionMatrixCode === code)?.jobTitle || code;

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-custom-primary dark:text-dark-primary">
                    Employment History for {employeeNumber}
                </h4>
                <Button
                    variant="outline"
                    type="button"
                    onClick={() => setShowAdd(true)}
                    disabled={addablePositions.length === 0 || loading}
                >
                    <span className="flex items-center">
                        <PlusCircle size={16} className="mr-1" /> Add
                    </span>
                </Button>
            </div>
            {error && <div className="text-xs text-red-600 mb-2">{error}</div>}
            {loading ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">Loading...</div>
            ) : rows.length === 0 ? (
                <div className="text-sm text-gray-500 dark:text-gray-400">No employment history.</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm border rounded">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th className="px-3 py-2 text-left">Position</th>
                                <th className="px-3 py-2 text-left">Status</th>
                                <th className="px-3 py-2 text-left">Start</th>
                                <th className="px-3 py-2 text-left">End</th>
                                <th className="px-3 py-2 text-left">Type</th>
                                <th className="px-3 py-2 text-left">Notes</th>
                                <th className="px-3 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y dark:divide-gray-700">
                            {rows
                                .sort((a, b) => a.startDate < b.startDate ? 1 : -1)
                                .map(r => {
                                    const s = statusInfo(r);
                                    const isEditable = !r.endDate; // only current editable
                                    return (
                                        <tr key={r.employmentID} className="bg-white dark:bg-dark-input">
                                            <td className="px-3 py-2">{posName(r.positionMatrixCode)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>
                                                    {s.icon}{s.label}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">{r.startDate.substring(0, 10)}</td>
                                            <td className="px-3 py-2">{r.endDate ? r.endDate.substring(0, 10) : '—'}</td>
                                            <td className="px-3 py-2">{r.employmentType}</td>
                                            <td className="px-3 py-2 max-w-[180px] truncate" title={r.notes}>{r.notes || '—'}</td>
                                            <td className="px-3 py-2 text-right space-x-2">
                                                {isEditable && (
                                                    <button
                                                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary"
                                                        onClick={() => setEditTarget(r)}
                                                        title="Edit"
                                                    >
                                                        <Edit3 size={16} />
                                                    </button>
                                                )}
                                                <button
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => removeRow(r.employmentID)}
                                                    title="Delete"
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
                title="Add Current Positions"
                items={addablePositions}
                idKey="positionMatrixCode"
                columns={[
                    { header: 'Code', field: 'positionMatrixCode' as any },
                    { header: 'Title', field: 'jobTitle' as any },
                    { header: 'Active', render: (p: JobPosition) => p.isActive ? 'Yes' : 'No', className: 'text-xs text-gray-500' }
                ]}
                searchFields={['positionMatrixCode', 'jobTitle'] as any}
                onClose={() => setShowAdd(false)}
                onConfirm={addPositions}
                multiSelect
                footerPrimaryLabel="Add Selected"
            />

            <EditEmploymentHistoryModal
                isOpen={!!editTarget}
                record={editTarget}
                onClose={() => { if (!editBusy) { setEditTarget(null); setEditError(null); } }}
                onSave={saveEdit}
                isBusy={editBusy}
                error={editError}
            />
        </div>
    );
};

export default UserEmploymentHistoryManager;