import React, { useState, useMemo } from 'react';
import type { Competency } from '../../types/competency';
import type { JobRequirement } from '../../services/jobRequirementService';
import type { JobPosition } from '../../services/jobPositionService';
import { Plus, Trash2 } from 'lucide-react';
import ConfirmModal from '../ui/ConfirmModal';
import GenericSelectModal from '../ui/GenericSelectModal';
import Button from '../ui/Button';

interface JobLinkManagerProps {
    competency: Competency;
    allJobPositions: JobPosition[];
    linkedRequirements: JobRequirement[];
    onAddLink: (competencyId: number, positionCode: string, status: string) => Promise<void>;
    onRemoveLink: (matrixId: number) => Promise<void>;
}

const JobLinkManager: React.FC<JobLinkManagerProps> = ({ competency, allJobPositions, linkedRequirements, onAddLink, onRemoveLink }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [infoOpen, setInfoOpen] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const availablePositions = useMemo(() => {
        const linkedCodes = new Set(linkedRequirements.map(r => r.positionMatrixCode));
        return allJobPositions.filter(p => p.isActive && !linkedCodes.has(p.positionMatrixCode));
    }, [allJobPositions, linkedRequirements]);

    const handleConfirmPositions = async (codes: string[]) => {
        if (!codes || codes.length === 0) return;
        setIsLoading(true);
        setError('');
        try {
            for (const code of codes) {
                // eslint-disable-next-line no-await-in-loop
                await onAddLink(competency.competencyID, code, 'Required');
            }
        } catch (err: any) {
            setError(err.data?.error || 'Failed to add one or more links.');
        } finally {
            setIsLoading(false);
            setShowPicker(false);
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

    const hasPositions = availablePositions.length > 0;

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
                    <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => (hasPositions ? setShowPicker(true) : setInfoOpen(true))} disabled={isLoading}>
                            <Plus size={16} className="inline-block mr-2" /> Select Positions
                        </Button>
                        {!hasPositions && <span className="text-xs text-gray-500">No available positions</span>}
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            </div>
            <ConfirmModal
                isOpen={infoOpen}
                title="No available positions"
                message="Create a new job position to link. Active positions that aren't already linked will appear in the dropdown."
                confirmLabel="OK"
                confirmVariant="primary"
                onConfirm={() => setInfoOpen(false)}
                onCancel={() => setInfoOpen(false)}
                showCancel={false}
            />
            <GenericSelectModal<JobPosition>
                isOpen={showPicker}
                title={`Select positions to link`}
                items={availablePositions}
                idKey="positionMatrixCode"
                columns={[
                    { header: 'Job Title', field: 'jobTitle' },
                    { header: 'Code', field: 'positionMatrixCode', className: 'text-gray-500' },
                ]}
                searchFields={[ 'jobTitle', 'positionMatrixCode' ] as any}
                multiSelect
                onClose={() => setShowPicker(false)}
                onConfirm={handleConfirmPositions}
                footerPrimaryLabel="Add Links"
            />
        </div>
    );
};

export default JobLinkManager;