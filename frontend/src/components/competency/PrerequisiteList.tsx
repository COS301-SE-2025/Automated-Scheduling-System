import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Competency } from '../../types/competency';

interface PrerequisiteListProps {
    prerequisites: Competency[];
    onDelete: (prerequisiteId: number) => void;
}

const PrerequisiteList: React.FC<PrerequisiteListProps> = ({ prerequisites, onDelete }) => {
    if (!prerequisites || prerequisites.length === 0) {
        return <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4 py-4">No prerequisites assigned.</p>;
    }

    return (
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-60 overflow-y-auto pr-2">
            {prerequisites.map(prereq => (
                <li key={prereq.competencyID} className="py-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">{prereq.competencyName}</span>
                    <button
                        onClick={() => onDelete(prereq.competencyID)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50"
                        title={`Remove ${prereq.competencyName}`}
                    >
                        <Trash2 size={16} />
                    </button>
                </li>
            ))}
        </ul>
    );
};

export default PrerequisiteList;