import React, { useState, useEffect } from 'react';
import type { CompetencyType } from '../../types/competency';
import { Plus, Edit2, EyeOff, Undo2 } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';

interface TypeManagementModalProps {
    isOpen: boolean;
    onClose: () => void;
    types: CompetencyType[];
    onAdd: (name: string, desc: string) => Promise<any>;
    onUpdate: (name: string, desc: string) => Promise<any>;
    onToggleStatus: (name: string, isActive: boolean) => Promise<any>;
}

const TypeManagementModal: React.FC<TypeManagementModalProps> = ({ isOpen, onClose, types, onAdd, onUpdate, onToggleStatus }) => {
    const [mode, setMode] = useState<'add' | 'edit'>('add');
    const [currentType, setCurrentType] = useState<CompetencyType | null>(null);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [apiError, setApiError] = useState('');

    // confirm modal state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [confirmTitle, setConfirmTitle] = useState('');
    const [confirmMessage, setConfirmMessage] = useState<React.ReactNode>(null);
    const [confirmVariant, setConfirmVariant] = useState<'primary' | 'danger' | 'outline'>('primary');
    const confirmActionRef = React.useRef<() => Promise<void> | void>(() => {});

    useEffect(() => {
        if (!isOpen) {
            resetForm();
        }
    }, [isOpen]);

    const resetForm = () => {
        setMode('add');
        setCurrentType(null);
        setName('');
        setDescription('');
        setApiError('');
    };

    const handleEditClick = (type: CompetencyType) => {
        setMode('edit');
        setCurrentType(type);
        setName(type.typeName);
        setDescription(type.description || '');
        setApiError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError('');
        try {
            if (mode === 'add') {
                await onAdd(name, description);
            } else if (currentType) {
                await onUpdate(currentType.typeName, description);
            }
            resetForm();
        } catch (err: any) {
            setApiError(err.data?.error || err.message || 'An error occurred.');
        }
    };

    const handleToggleClick = (typeName: string, newStatus: boolean) => {
        const action = newStatus ? 'Reactivate' : 'Deactivate';
        setConfirmTitle(`${action} Competency Type`);
        setConfirmMessage(
            <span>Are you sure you want to {action.toLowerCase()} the type "<strong>{typeName}</strong>"?</span>
        );
        setConfirmVariant(newStatus ? 'primary' : 'danger');
        setConfirmError(null);
        confirmActionRef.current = async () => {
            try {
                setConfirmBusy(true);
                await onToggleStatus(typeName, newStatus);
                setConfirmOpen(false);
            } catch (err: any) {
                setConfirmError(err?.data?.error || err?.message || `Failed to ${action.toLowerCase()} type.`);
            } finally {
                setConfirmBusy(false);
            }
        };
        setConfirmOpen(true);
    };

    if (!isOpen) return null;

    return (
        <>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-2xl bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">Manage Competency Types</h3>
                    <button onClick={onClose} className="p-1 rounded-full text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
                    <div className="border-r dark:border-gray-700 pr-6">
                        <h4 className="font-semibold mb-2 text-custom-primary dark:text-dark-primary">Existing Types</h4>

                        <div className="max-h-80 overflow-y-auto pr-2">
                            <ul className="space-y-2">
                                {types.map(type => (
                                    <li key={type.typeName} className={`p-2 rounded-md flex justify-between items-center group ${type.isActive ? 'bg-gray-50 dark:bg-dark-input' : 'bg-red-50 dark:bg-red-900/20 text-gray-500'}`}>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{type.typeName}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{type.description || 'No description'}</p>
                                            {!type.isActive && <span className="text-xs font-bold text-red-600 dark:text-red-400">(Inactive)</span>}
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                                            <button onClick={() => handleEditClick(type)} className="p-1 text-blue-600 hover:text-blue-800" title="Edit Description"><Edit2 size={14} /></button>
                                            {type.isActive
                                                ? <button onClick={() => handleToggleClick(type.typeName, false)} className="p-1 text-red-600 hover:text-red-800" title="Deactivate"><EyeOff size={14} /></button>
                                                : <button onClick={() => handleToggleClick(type.typeName, true)} className="p-1 text-green-600 hover:text-green-800" title="Reactivate"><Undo2 size={14} /></button>
                                            }
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    {/* Right side: Form for add/edit */}
                    <div>
                        <h4 className="font-semibold mb-2 text-custom-primary dark:text-dark-primary">{mode === 'add' ? 'Add New Type' : `Editing: ${currentType?.typeName}`}</h4>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="typeName" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Type Name</label>
                                <input type="text" id="typeName" value={name} onChange={(e) => setName(e.target.value)} required disabled={mode === 'edit'} className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-custom-primary disabled:bg-gray-100 dark:disabled:bg-gray-800" />
                            </div>
                            <div>
                                <label htmlFor="typeDescription" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Description</label>
                                <textarea id="typeDescription" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 focus:outline-none focus:ring-1 focus:ring-custom-primary" />
                            </div>
                            {apiError && <p className="text-sm text-red-600">{apiError}</p>}
                            <div className="flex justify-end items-center gap-3 pt-2">
                                {mode === 'edit' && <button type="button" onClick={resetForm} className="text-sm text-gray-600 hover:underline">Cancel Edit</button>}
                                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-custom-primary rounded-md shadow-sm hover:bg-custom-primary-hover">
                                    {mode === 'add' ? <><Plus size={16} className="inline-block mr-1" /> Add Type</> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        <ConfirmModal
            isOpen={confirmOpen}
            title={confirmTitle}
            message={confirmMessage}
            confirmLabel="Confirm"
            cancelLabel="Cancel"
            confirmVariant={confirmVariant}
            isBusy={confirmBusy}
            error={confirmError}
            onCancel={() => !confirmBusy && setConfirmOpen(false)}
            onConfirm={() => confirmActionRef.current?.()}
        />
        </>
    );
};

export default TypeManagementModal;