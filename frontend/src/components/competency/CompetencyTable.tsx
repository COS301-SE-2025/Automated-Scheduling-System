import React from 'react';
import type { Competency } from '../../types/competency';
import { Edit, Trash2, ListTree, Users, ChevronDown } from 'lucide-react';
import JobLinkManager from './JobLinkManager';
import type { JobRequirement } from '../../services/jobRequirementService';
import type { JobPosition } from '../../services/jobPositionService';

interface CompetencyTableProps {
    competencies: Competency[];
    isLoading: boolean;
    onEdit: (competency: Competency) => void;
    onDelete: (competency: Competency) => void;
    onViewPrerequisites: (competency: Competency) => void;
    expandedCompetencyId: number | null;
    onToggleExpand: (competencyId: number) => void;
    allJobPositions: JobPosition[];
    jobRequirements: JobRequirement[];
    onAddJobLink: (competencyId: number, positionCode: string, status: string) => Promise<void>;
    onRemoveJobLink: (matrixId: number) => Promise<void>;
}

const CompetencyTable: React.FC<CompetencyTableProps> = ({ 
    competencies, 
    isLoading, 
    onEdit, 
    onDelete, 
    onViewPrerequisites, 
    expandedCompetencyId, 
    onToggleExpand, 
    allJobPositions, 
    jobRequirements, 
    onAddJobLink, 
    onRemoveJobLink 
}) => {

    const getStatusClass = (isActive: boolean): string => {
        if (isActive) {
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        }
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    };

    if (isLoading) {
        return (
            <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-secondary"></div>
            </div>
        );
    }

    if (competencies.length === 0) {
        return (
            <div className="mt-6 text-center py-10 bg-white dark:bg-dark-input rounded-md shadow">
                <p className="text-custom-third dark:text-dark-secondary">No competencies found.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full">
                            <thead className="bg-gray-50 dark:bg-dark-input">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary sm:pl-6">
                                        Competency Name
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                                        Type
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                                        Status
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                                        Expires (Months)
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-custom-primary dark:text-dark-primary">
                                        Prerequisites
                                    </th>
                                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-custom-primary dark:text-dark-primary">
                                        Job Links
                                    </th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                                {competencies.map((competency) => {
                                    const isExpanded = expandedCompetencyId === competency.competencyID;
                                    const linkedRequirements = jobRequirements.filter(r => r.competencyID === competency.competencyID);

                                    return (
                                        <React.Fragment key={competency.competencyID}>
                                            <tr className={isExpanded ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500' : ''}>
                                                <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="font-medium text-gray-900 dark:text-white">{competency.competencyName}</div>
                                                    <div className="text-gray-500 dark:text-gray-400 truncate" style={{ maxWidth: '300px' }}>{competency.description}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {competency.competencyTypeName || 'N/A'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusClass(competency.isActive)}`}>
                                                        {competency.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {competency.expiryPeriodMonths ?? 'N/A'}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                    <button
                                                        type="button"
                                                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary p-1"
                                                        onClick={() => onViewPrerequisites(competency)}
                                                        title="View Prerequisites"
                                                    >
                                                        <ListTree size={18} />
                                                    </button>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                                                    <button
                                                        type="button"
                                                        className="flex items-center justify-center w-full text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary p-1"
                                                        onClick={() => onToggleExpand(competency.competencyID)}
                                                        title="View Job Matrix Links"
                                                    >
                                                        <Users size={18} />
                                                        <ChevronDown 
                                                            size={16} 
                                                            className={`ml-1 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        type="button"
                                                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary p-1"
                                                        onClick={() => onEdit(competency)}
                                                        title="Edit Competency"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 ml-2"
                                                        onClick={() => onDelete(competency)}
                                                        title="Deactivate Competency"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {isExpanded && (
                                                <tr>
                                                    <td colSpan={7} className="p-4 bg-slate-50 dark:bg-slate-800/50">
                                                        <div className="bg-white dark:bg-dark-input border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm">
                                                            <JobLinkManager
                                                                competency={competency}
                                                                allJobPositions={allJobPositions}
                                                                linkedRequirements={linkedRequirements}
                                                                onAddLink={onAddJobLink}
                                                                onRemoveLink={onRemoveJobLink}
                                                            />
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompetencyTable;