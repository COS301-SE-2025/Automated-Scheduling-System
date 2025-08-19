import React, { useState, useMemo, useCallback } from 'react';
import type { Competency } from '../../types/competency';
import ConfirmModal from '../ui/ConfirmModal';

interface AddPrerequisiteFormProps {
    onAdd: (prerequisiteId: number) => void;
    currentCompetencyID: number;
    allCompetencies: Competency[];
    existingPrerequisiteIDs: number[];
}

const AddPrerequisiteForm: React.FC<AddPrerequisiteFormProps> = ({ onAdd, currentCompetencyID, allCompetencies, existingPrerequisiteIDs }) => {
    const [selectedPrereq, setSelectedPrereq] = useState<string>('');
    const [infoOpen, setInfoOpen] = useState(false);

    const availableOptions = useMemo(() => {
        const existingIdsSet = new Set(existingPrerequisiteIDs);
        return allCompetencies.filter(
            c => c.competencyID !== currentCompetencyID && !existingIdsSet.has(c.competencyID)
        );
    }, [allCompetencies, currentCompetencyID, existingPrerequisiteIDs]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPrereq) {
            onAdd(parseInt(selectedPrereq, 10));
            setSelectedPrereq('');
        }
    };

    const hasOptions = availableOptions.length > 0;
    const placeholder = hasOptions ? '-- Choose a competency --' : 'Create a new competency to add prerequisites';

    const handleGuardedOpen = useCallback((e: React.MouseEvent<HTMLSelectElement> | React.KeyboardEvent<HTMLSelectElement>) => {
        if (!hasOptions) {
            e.preventDefault();
            // Show info popup instead of disabled select
            setInfoOpen(true);
        }
    }, [hasOptions]);

    return (
        <form onSubmit={handleSubmit} className="flex items-end gap-3 mt-4">
            <div className="flex-grow">
                <label htmlFor="prerequisite-select" className="block text-sm font-medium text-gray-700 dark:text-dark-secondary mb-1">
                    Select a prerequisite to add
                </label>
                <select
                    id="prerequisite-select"
                    value={selectedPrereq}
                    onChange={(e) => setSelectedPrereq(e.target.value)}
                    onMouseDown={handleGuardedOpen}
                    onKeyDown={(e) => {
                        // Intercept Enter/Space/Arrow to show info when no options
                        if (!hasOptions && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
                            handleGuardedOpen(e);
                        }
                    }}
                    className={`block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input ${!hasOptions ? 'cursor-default' : ''}`}
                >
                    <option value="" disabled>{placeholder}</option>
                    {availableOptions.map(opt => (
                        <option key={opt.competencyID} value={opt.competencyID}>{opt.competencyName}</option>
                    ))}
                </select>
            </div>
            <button
                type="submit"
                disabled={!selectedPrereq || !hasOptions}
                className="px-4 py-2 text-sm font-medium text-white bg-custom-secondary border border-transparent rounded-md shadow-sm hover:bg-custom-third focus:outline-none disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
                Add
            </button>
            <ConfirmModal
                isOpen={infoOpen}
                title="No eligible competencies"
                message="Create a new competency to add prerequisites. Once created, it will appear here if it's not already linked or the same as the current competency."
                confirmLabel="OK"
                confirmVariant="primary"
                onConfirm={() => setInfoOpen(false)}
                onCancel={() => setInfoOpen(false)}
                showCancel={false}
            />
        </form>
    );
};

export default AddPrerequisiteForm;