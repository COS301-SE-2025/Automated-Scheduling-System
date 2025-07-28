import React from 'react';

interface CompetencyFiltersProps {
    onSearch: (term: string) => void;
    onFilterChange: (name: string, value: string) => void;
    filters: {
        competencyTypeName: string;
        isActive: string;
    };
    availableTypes: string[];
}

const CompetencyFilters: React.FC<CompetencyFiltersProps> = ({
    onSearch,
    onFilterChange,
    filters,
    availableTypes,
}) => {
    return (
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 py-4">
            <div className="sm:col-span-3">
                <label htmlFor="search" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
                    Search Competencies
                </label>
                <div className="mt-2">
                    <input
                        type="text"
                        name="search"
                        id="search"
                        onChange={(e) => onSearch(e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
                        placeholder="Search by name or description..."
                    />
                </div>
            </div>

            <div className="sm:col-span-2">
                <label htmlFor="competencyTypeName" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
                    Filter by Type
                </label>
                <div className="mt-2">
                    <select
                        id="competencyTypeName"
                        name="competencyTypeName"
                        value={filters.competencyTypeName}
                        onChange={(e) => onFilterChange(e.target.name, e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
                    >
                        <option value="">All Types</option>
                        {availableTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="sm:col-span-1">
                <label htmlFor="isActive" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
                    Status
                </label>
                <div className="mt-2">
                    <select
                        id="isActive"
                        name="isActive"
                        value={filters.isActive}
                        onChange={(e) => onFilterChange(e.target.name, e.target.value)}
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
                    >
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                </div>
            </div>
        </div>
    );
};

export default CompetencyFilters;