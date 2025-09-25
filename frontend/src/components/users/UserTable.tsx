import React from 'react';
import { Edit, ChevronDown } from 'lucide-react';
import UserCompetencyManager from './UserCompetencyManager';
import UserEmploymentHistoryManager from './UserEmploymentHistoryManager';
import type { Competency } from '../../types/competency';
import type { User } from '../../types/user';
import type { JobPosition } from '../../services/jobPositionService';

interface UserTableProps {
    users: User[];
    isLoading: boolean;
    onEdit: (user: User) => void;
    onDelete: (user: User) => void;
    allCompetencies: Competency[];
    jobPositions: JobPosition[];
    expandedUserPanel: { userId: number; panel: 'competencies' | 'positions' } | null;
    onTogglePanel: (userId: number, panel: 'competencies' | 'positions') => void;
}

const UserTable: React.FC<UserTableProps> = ({
    users,
    isLoading,
    onEdit,
    allCompetencies,
    jobPositions,
    expandedUserPanel,
    onTogglePanel
}) => {

    const getStatusClass = (employeeStatus: string): string => {
        const lowerCaseStatus = (employeeStatus || '').toLowerCase();
        if (lowerCaseStatus.includes('active')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        if (['terminated', 'inactive', 'resigned'].some(s => lowerCaseStatus.includes(s)))
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        if (['leave', 'pending'].some(s => lowerCaseStatus.includes(s)))
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    };

    if (isLoading) {
        return (
            <div className="mt-6 flex justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-secondary"></div>
            </div>
        );
    }

    if (users.length === 0) {
        return (
            <div className="mt-6 text-center py-10 bg-white dark:bg-dark-input rounded-md shadow">
                <p className="text-custom-third dark:text-dark-secondary">No users found.</p>
            </div>
        );
    }

    return (
        <div className="mt-6 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                    <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-dark-input">
                                <tr>
                                    <th className="py-3.5 pl-4 pr-3 sm:pl-6 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Name</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Contact Email</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Employee Status</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">App Role</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Competencies</th>
                                    <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Job Positions</th>
                                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                                {users.map(user => {
                                    const competenciesOpen = expandedUserPanel?.userId === user.id && expandedUserPanel.panel === 'competencies';
                                    const positionsOpen = expandedUserPanel?.userId === user.id && expandedUserPanel.panel === 'positions';
                                    return (
                                        <React.Fragment key={user.id}>
                                            <tr className={(competenciesOpen || positionsOpen) ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {user.email}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusClass(user.employeeStatus)}`}>
                                                        {user.employeeStatus ?? 'N/A'}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {user.role}
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => onTogglePanel(user.id, 'competencies')}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary text-xs"
                                                        title="Show Competencies"
                                                    >
                                                        <ChevronDown size={16} className={`transition-transform ${competenciesOpen ? 'rotate-180' : ''}`} />
                                                        {competenciesOpen ? 'Hide' : 'View'}
                                                    </button>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm">
                                                    <button
                                                        type="button"
                                                        onClick={() => onTogglePanel(user.id, 'positions')}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary text-xs"
                                                        title="Show Positions"
                                                    >
                                                        <ChevronDown size={16} className={`transition-transform ${positionsOpen ? 'rotate-180' : ''}`} />
                                                        {positionsOpen ? 'Hide' : 'View'}
                                                    </button>
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                    <button
                                                        type="button"
                                                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary p-1"
                                                        onClick={() => onEdit(user)}
                                                        title="Edit User"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                            {(competenciesOpen || positionsOpen) && (
                                                <tr>
                                                    <td colSpan={7} className="p-0">
                                                        <div className="border-t dark:border-gray-700 bg-slate-50 dark:bg-slate-800/40">
                                                            {competenciesOpen && (
                                                                <UserCompetencyManager
                                                                    employeeNumber={user.employeeNumber}
                                                                    allCompetencies={allCompetencies}
                                                                />
                                                            )}
                                                            {positionsOpen && (
                                                                <UserEmploymentHistoryManager
                                                                    employeeNumber={user.employeeNumber}
                                                                    jobPositions={jobPositions}
                                                                />
                                                            )}
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

export default UserTable;