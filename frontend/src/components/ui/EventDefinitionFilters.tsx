import React from 'react';

interface EventDefinitionFiltersProps {
    onSearch: (term: string) => void;
    onFilterChange: (name: string, value: string) => void;
    filters: {
        facilitator: string;
    };
    availableFacilitators: string[];
}

const EventDefinitionFilters: React.FC<EventDefinitionFiltersProps> = ({
    onSearch,
    onFilterChange,
    filters,
    availableFacilitators,
}) => {
    return (
        <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 py-4">
            {/* Search Input */}
            <div className="sm:col-span-4">
                <label htmlFor="search-definitions" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
                    Search by Name/Description
                </label>
                <div className="mt-2">
                    <input
                        type="text"
                        id="search-definitions"
                        placeholder="e.g., Healthcheck, meeting..."
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Facilitator Filter */}
            <div className="sm:col-span-2">
                <label htmlFor="facilitator-filter" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
                    Filter by Facilitator
                </label>
                <div className="mt-2">
                    <select
                        id="facilitator-filter"
                        name="facilitator"
                        className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
                        value={filters.facilitator}
                        onChange={(e) => onFilterChange(e.target.name, e.target.value)}
                    >
                        <option value="">All Facilitators</option>
                        {availableFacilitators.map(facilitator => (
                            <option key={facilitator} value={facilitator}>{facilitator}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
};

export default EventDefinitionFilters;