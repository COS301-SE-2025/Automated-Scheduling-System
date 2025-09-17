import React, { useState, useMemo } from 'react';
import type { Competency } from '../../types/competency';
import ConfirmModal from '../ui/ConfirmModal';
import GenericSelectModal from '../ui/GenericSelectModal';
import Button from '../ui/Button';

interface AddPrerequisiteFormProps {
    onAdd: (prerequisiteId: number) => void;
    currentCompetencyID: number;
    allCompetencies: Competency[];
    existingPrerequisiteIDs: number[];
}

const AddPrerequisiteForm: React.FC<AddPrerequisiteFormProps> = ({ onAdd, currentCompetencyID, allCompetencies, existingPrerequisiteIDs }) => {
    const [infoOpen, setInfoOpen] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

    const availableOptions = useMemo(() => {
        const existingIdsSet = new Set(existingPrerequisiteIDs);
        return allCompetencies.filter(
            c => c.competencyID !== currentCompetencyID && !existingIdsSet.has(c.competencyID)
        );
    }, [allCompetencies, currentCompetencyID, existingPrerequisiteIDs]);

    const handleConfirmPrereqs = async (ids: string[]) => {
        if (!ids || ids.length === 0) return;
        for (const id of ids) {
            // eslint-disable-next-line no-await-in-loop
            await onAdd(parseInt(id, 10));
        }
        setShowPicker(false);
    };

    const hasOptions = availableOptions.length > 0;

    const handleOpen = () => {
        if (!hasOptions) setInfoOpen(true); else setShowPicker(true);
    };

    return (
        <div className="flex items-end gap-3 mt-4">
            <div className="flex-grow">
                <label className="block text-sm font-medium text-gray-700 dark:text-dark-secondary mb-1">
                    Add prerequisites
                </label>
                <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" onClick={handleOpen}>Select Competencies</Button>
                    <span className="text-xs text-gray-500">Existing: {existingPrerequisiteIDs.length}</span>
                </div>
            </div>
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
            <GenericSelectModal<Competency>
                isOpen={showPicker}
                title="Select prerequisites"
                items={availableOptions}
                idKey={(c) => String(c.competencyID)}
                columns={[{ header: 'Name', field: 'competencyName' }, { header: 'Type', field: 'competencyTypeName', className: 'text-gray-500' }]}
                searchFields={[ 'competencyName', 'competencyTypeName' ] as any}
                multiSelect
                onClose={() => setShowPicker(false)}
                onConfirm={handleConfirmPrereqs}
                footerPrimaryLabel="Add Selected"
            />
        </div>
    );
};

export default AddPrerequisiteForm;