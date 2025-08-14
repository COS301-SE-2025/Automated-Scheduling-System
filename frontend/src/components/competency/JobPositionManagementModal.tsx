import React, { useState, useEffect } from 'react';
import type { JobPosition } from '../../services/jobPositionService';
import { Plus, Edit2, Trash2, Undo2 } from 'lucide-react';

interface JobPositionManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    positions: JobPosition[];
    onAdd: (data: { positionMatrixCode: string; jobTitle: string; description: string }) => Promise<any>;
    onUpdate: (code: string, data: { jobTitle: string; description: string }) => Promise<any>;
    onToggleStatus: (code: string, isActive: boolean) => Promise<any>; // Changed from onDelete
}

const JobPositionManagementModal: React.FC<JobPositionManagementModalProps> = ({ isOpen, onClose, positions, onAdd, onUpdate, onToggleStatus }) => {
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [currentPos, setCurrentPos] = useState<JobPosition | null>(null);
    const [formData, setFormData] = useState({ code: '', title: '', description: '' });
    const [apiError, setApiError] = useState('');

    useEffect(() => { if (!isOpen) resetForm(); }, [isOpen]);

    const resetForm = () => {
        setMode('add');
        setCurrentPos(null);
        setFormData({ code: '', title: '', description: '' });
        setApiError('');
    };

    const handleEditClick = (pos: JobPosition) => {
        setMode('edit');
        setCurrentPos(pos);
        setFormData({ code: pos.positionMatrixCode, title: pos.jobTitle, description: pos.description });
        setApiError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        try {
            if (mode === 'add') {
                await onAdd({ positionMatrixCode: formData.code, jobTitle: formData.title, description: formData.description });
            } else if (currentPos) {
                await onUpdate(currentPos.positionMatrixCode, { jobTitle: formData.title, description: formData.description });
            }
            resetForm();
        } catch (err: any) {
            setApiError(err.data?.error || err.message || 'An error occurred.');
        }
    };

    const handleToggleClick = async (pos: JobPosition, newStatus: boolean) => {
        const action = newStatus ? 'reactivate' : 'deactivate';
        if (window.confirm(`Are you sure you want to ${action} the position "${pos.jobTitle}"?`)) {
            try {
                await onToggleStatus(pos.positionMatrixCode, newStatus);
            } catch (err: any) {
                alert(err.data?.error || err.message || `Failed to ${action} position.`);
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-3xl bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">Manage Job Positions</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">&times;</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <div className="border-r dark:border-gray-700 pr-6 flex flex-col">
                        <h4 className="font-semibold mb-2 text-custom-primary dark:text-dark-primary flex-shrink-0">Existing Positions</h4>
                            <ul className="space-y-2">
                                {positions.map(pos => (
                                    <li key={pos.positionMatrixCode} className={`p-2 rounded-md flex justify-between items-center group ${pos.isActive ? 'bg-gray-50 dark:bg-dark-input' : 'bg-red-50 dark:bg-red-900/20 text-gray-500'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{pos.jobTitle}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{pos.positionMatrixCode}</p>
                                            {!pos.isActive && <span className="text-xs font-bold text-red-600 dark:text-red-400">(Inactive)</span>}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleEditClick(pos)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit"><Edit2 size={14} /></button>
                                            {pos.isActive 
                                                ? <button onClick={() => handleToggleClick(pos, false)} className="p-1 text-red-600 hover:text-red-800" title="Deactivate"><Trash2 size={14} /></button>
                                                : <button onClick={() => handleToggleClick(pos, true)} className="p-1 text-green-600 hover:text-green-800" title="Reactivate"><Undo2 size={14} /></button>
                                            }
                                        </div>
                                    </li>
                                ))}
                            </ul>
                    </div>
                    <div>
                        <h4 className="font-semibold mb-2 text-custom-primary dark:text-dark-primary">{mode === 'add' ? 'Add New Position' : `Editing: ${currentPos?.jobTitle}`}</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="posCode" className="block text-sm font-medium">Position Matrix Code</label>
                                <input type="text" id="posCode" value={formData.code} onChange={e => setFormData(f => ({ ...f, code: e.target.value }))} required disabled={mode === 'edit'} className="mt-1 w-full bg-transparent border border-gray-500 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-custom-primary disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                            </div>
                            <div>
                                <label htmlFor="posTitle" className="block text-sm font-medium">Job Title</label>
                                <input type="text" id="posTitle" value={formData.title} onChange={e => setFormData(f => ({ ...f, title: e.target.value }))} required className="mt-1 w-full bg-transparent border border-gray-500 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-custom-primary" />
                            </div>
                            <div>
                                <label htmlFor="posDesc" className="block text-sm font-medium">Description</label>
                                <textarea id="posDesc" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} rows={3} className="mt-1 w-full bg-transparent border border-gray-500 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-custom-primary" />
                            </div>
                            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
                            <div className="flex justify-end items-center gap-3 pt-2">
                                {mode === 'edit' && <button type="button" onClick={resetForm} className="text-sm text-gray-600 hover:underline">Cancel Edit</button>}
                                <button type="submit" className="px-4 py-2 text-sm text-white bg-custom-primary rounded-md hover:bg-custom-primary-hover">
                                    {mode === 'add' ? <><Plus size={16} className="inline mr-1" />Add</> : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JobPositionManagementModal;