import React, { useState, useMemo } from 'react';
import type { Competency } from '../../types/competency';
import type { JobRequirement } from '../../services/jobRequirementService';
import type { JobPosition } from '../../services/jobPositionService';
import { Plus, Trash2 } from 'lucide-react';

interface JobLinkManagerProps {
    competency: Competency;
    allJobPositions: JobPosition[];
    linkedRequirements: JobRequirement[];
    onAddLink: (competencyId: number, positionCode: string, status: string) => Promise<void>;
    onRemoveLink: (matrixId: number) => Promise<void>;
}

const JobLinkManager: React.FC<JobLinkManagerProps> = ({ competency, allJobPositions, linkedRequirements, onAddLink, onRemoveLink }) => {
    const [selectedPosition, setSelectedPosition] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const availablePositions = useMemo(() => {
        const linkedCodes = new Set(linkedRequirements.map(r => r.positionMatrixCode));
        return allJobPositions.filter(p => p.isActive && !linkedCodes.has(p.positionMatrixCode));
    }, [allJobPositions, linkedRequirements]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPosition) return;

        setIsLoading(true);
        setError('');
        try {
            await onAddLink(competency.competencyID, selectedPosition, 'Required');
            setSelectedPosition('');
        } catch (err: any) {
            setError(err.data?.error || 'Failed to add link.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRemove = async (matrixId: number) => {
        setIsLoading(true);
        setError('');
        try {
            await onRemoveLink(matrixId);
        } catch (err: any) {
            setError(err.data?.error || 'Failed to remove link.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-sm text-custom-primary dark:text-dark-primary mb-2">Linked Job Positions</h4>
                    
                        {linkedRequirements.length > 0 ? (
                            <ul className="space-y-1">
                                {linkedRequirements.map(req => (
                                    <li key={req.customMatrixID} className="flex justify-between items-center text-sm p-2 bg-white dark:bg-dark-input rounded">
                                        <span>{req.jobPosition?.jobTitle || req.positionMatrixCode}</span>
                                        <button onClick={() => handleRemove(req.customMatrixID)} className="text-red-500 hover:text-red-700 p-1"><Trash2 size={14} /></button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No job positions linked.</p>
                        )}
                    
                </div>
                <div>
                    <h4 className="font-semibold text-sm text-custom-primary dark:text-dark-primary mb-2">Add a Link</h4>
                    <form onSubmit={handleAdd} className="flex items-end gap-2">
                        <div className="flex-grow">
                            <label htmlFor={`pos-select-${competency.competencyID}`} className="sr-only">Select Position</label>
                            <select
                                id={`pos-select-${competency.competencyID}`}
                                value={selectedPosition}
                                onChange={e => setSelectedPosition(e.target.value)}
                                className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm"
                            >
                                <option value="" disabled>-- Choose a position --</option>
                                {availablePositions.map(pos => <option key={pos.positionMatrixCode} value={pos.positionMatrixCode}>{pos.jobTitle}</option>)}
                            </select>
                        </div>
                        <button type="submit" disabled={!selectedPosition || isLoading} className="px-3 py-1.5 text-sm font-semibold text-white bg-custom-secondary rounded-md shadow-sm hover:bg-custom-third disabled:bg-gray-400">
                            <Plus size={16} />
                        </button>
                    </form>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default JobLinkManager;