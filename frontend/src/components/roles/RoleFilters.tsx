import React from 'react';

interface RoleFiltersProps {
  search: string;
  onSearch: (term: string) => void;
}

const RoleFilters: React.FC<RoleFiltersProps> = ({ search, onSearch }) => {
  return (
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 py-4">
      <div className="sm:col-span-4">
        <label htmlFor="role-search" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
          Search Roles
        </label>
        <div className="mt-2">
          <input
            type="text"
            id="role-search"
            name="role-search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 bg-white dark:bg-dark-input"
            placeholder="Search by name or description..."
          />
        </div>
      </div>
    </div>
  );
};

export default RoleFilters;
