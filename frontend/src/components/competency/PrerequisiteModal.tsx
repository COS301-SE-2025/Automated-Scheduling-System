import React from 'react';
import type { Competency } from '../../types/competency';
import PrerequisiteList from './PrerequisiteList';
import AddPrerequisiteForm from './AddPrerequisiteForm';

interface PrerequisiteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddPrerequisite: (prerequisiteId: number) => Promise<void>;
    onRemovePrerequisite: (prerequisiteId: number) => Promise<void>;
    competency: Competency | null;
    allCompetencies: Competency[];
    apiError: string | null;
    isLoading: boolean;
}

const PrerequisiteModal: React.FC<PrerequisiteModalProps> = ({
    isOpen,
    onClose,
    onAddPrerequisite,
    onRemovePrerequisite,
    competency,
    allCompetencies,
    apiError,
    isLoading
}) => {
    if (!isOpen || !competency) return null;

    const existingPrerequisiteIDs = competency.Prerequisites?.map(p => p.competencyID) || [];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">
                        Prerequisites for: <span className="text-custom-secondary">{competency.competencyName}</span>
                    </h3>
                    <button type="button" onClick={onClose}>
                        <span className="text-2xl text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">&times;</span>
                    </button>
                </div>

                <div className="p-6">
                    <PrerequisiteList
                        prerequisites={competency.Prerequisites || []}
                        onDelete={onRemovePrerequisite}
                    />

                    <div className="mt-6 pt-6 border-t dark:border-gray-700">
                        <AddPrerequisiteForm
                            onAdd={onAddPrerequisite}
                            currentCompetencyID={competency.competencyID}
                            allCompetencies={allCompetencies}
                            existingPrerequisiteIDs={existingPrerequisiteIDs}
                        />
                    </div>

                    {isLoading && <p className="text-sm text-center text-blue-500 mt-2">Processing...</p>}
                    {apiError && <p className="text-sm text-center text-red-600 mt-2">{apiError}</p>}
                </div>
            </div>
        </div>
    );
};

export default PrerequisiteModal;