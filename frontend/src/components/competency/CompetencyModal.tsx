import React, { useState, useEffect } from 'react';
import type { Competency, AddCompetencyData, UpdateCompetencyData } from '../../types/competency';

interface CompetencyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AddCompetencyData | UpdateCompetencyData) => void;
    mode: 'add' | 'edit';
    competency?: Competency;
    apiError: string | null;
}

const CompetencyModal: React.FC<CompetencyModalProps> = ({ isOpen, onClose, onSave, mode, competency, apiError }) => {
    const [formData, setFormData] = useState({
        competencyName: '',
        description: '',
        competencyTypeName: 'Certification',
        expiryPeriodMonths: '',
        isActive: true,
    });

    useEffect(() => {
        if (mode === 'edit' && competency) {
            setFormData({
                competencyName: competency.competencyName,
                description: competency.description || '',
                competencyTypeName: competency.competencyTypeName || 'Certification',
                expiryPeriodMonths: competency.expiryPeriodMonths?.toString() || '',
                isActive: competency.isActive,
            });
        } else {
            setFormData({
                competencyName: '',
                description: '',
                competencyTypeName: 'Certification',
                expiryPeriodMonths: '',
                isActive: true,
            });
        }
    }, [mode, competency, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { id, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [id]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            expiryPeriodMonths: formData.expiryPeriodMonths ? parseInt(formData.expiryPeriodMonths, 10) : null,
        };
        onSave(dataToSave);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-2xl mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">
                        {mode === 'add' ? 'Add New Competency' : 'Edit Competency'}
                    </h3>
                    <button type="button" onClick={onClose}>
                        <span className="text-2xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">&times;</span>
                    </button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="p-6 space-y-6">
                        <div>
                            <label htmlFor="competencyName" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Competency Name</label>
                            <input type="text" id="competencyName" value={formData.competencyName} onChange={handleChange} required className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 text-custom-text dark:text-dark-text focus:border-custom-primary focus:ring-1 focus:ring-custom-primary focus:outline-none" />
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Description</label>
                            <textarea id="description" rows={3} value={formData.description} onChange={handleChange} className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 text-custom-text dark:text-dark-text focus:border-custom-primary focus:ring-1 focus:ring-custom-primary focus:outline-none"></textarea>
                        </div>
                        <div>
                            <label htmlFor="competencyTypeName" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Competency Type</label>
                            <select id="competencyTypeName" value={formData.competencyTypeName} onChange={handleChange} className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 text-custom-text dark:text-dark-text focus:border-custom-primary focus:ring-1 focus:ring-custom-primary focus:outline-none">
                                <option>Certification</option>
                                <option>Skill</option>
                                <option>License</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="expiryPeriodMonths" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary">Expiry Period (Months)</label>
                            <input type="number" id="expiryPeriodMonths" value={formData.expiryPeriodMonths} onChange={handleChange} placeholder="Leave blank if no expiry" className="mt-1 w-full bg-transparent border border-gray-500 dark:border-gray-700 rounded-md py-2 px-3 text-custom-text dark:text-dark-text focus:border-custom-primary focus:ring-1 focus:ring-custom-primary focus:outline-none" />
                        </div>
                        <div className="flex items-center pt-2">
                            <input id="isActive" type="checkbox" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 rounded border-gray-400 text-custom-secondary focus:ring-custom-primary" />
                            <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900 dark:text-dark-text">Is Active</label>
                        </div>
                        {apiError && <p className="text-sm text-red-600">{apiError}</p>}
                    </div>
                    <div className="flex items-center justify-end p-4 border-t dark:border-gray-700 space-x-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none dark:bg-dark-input dark:text-dark-secondary dark:border-gray-600 dark:hover:bg-gray-700">
                            Cancel
                        </button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-custom-primary border border-transparent rounded-md shadow-sm hover:bg-custom-primary-hover focus:outline-none">
                            Save Competency
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CompetencyModal;