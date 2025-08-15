import React from 'react';

interface RoleFiltersProps {
  search: string;
  onSearch: (term: string) => void;
}

const RoleFilters: React.FC<RoleFiltersProps> = ({ search, onSearch }) => {
  return (
    <div className="mt-6 bg-white dark:bg-dark-input p-4 rounded-md shadow">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full sm:max-w-sm rounded-md border-gray-300 dark:border-gray-700 dark:bg-dark-div dark:text-white"
          placeholder="Search roles..."
        />
      </div>
    </div>
  );
};

export default RoleFilters;
