import React from 'react';

interface UserFiltersProps {
  onSearch: (term: string) => void;
  onFilterChange: (name: string, value: string) => void;
  filters: {
    role: string;
    employeeStatus: string;
  };
  // New props to accept dynamic options
  availableRoles: string[];
  availableStatuses: string[];
}

const UserFilters: React.FC<UserFiltersProps> = ({
  onSearch,
  onFilterChange,
  filters,
  availableRoles,
  availableStatuses,
}) => {
  return (
    <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-6 py-4">
      {/* Search Input */}
      <div className="sm:col-span-2">
        <label htmlFor="search" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
          Search Users
        </label>
        <div className="mt-2">
          <input
            type="text"
            name="search"
            id="search"
            onChange={(e) => onSearch(e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 dark:bg-dark-input"
            placeholder="Name or email..."
          />
        </div>
      </div>

      {/* Role Filter Dropdown  */}
      <div className="sm:col-span-2">
        <label htmlFor="role" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
          Filter by Role
        </label>
        <div className="mt-2">
          <select
            id="role"
            name="role"
            value={filters.role}
            onChange={(e) => onFilterChange('role', e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 dark:bg-dark-input"
          >
            <option value="">All Roles</option>
            {/* Map over the provided roles to create options */}
            {availableRoles.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Status Filter Dropdown (Now Dynamic) */}
      <div className="sm:col-span-2">
        <label htmlFor="status" className="block text-sm font-medium leading-6 text-custom-primary dark:text-dark-secondary">
          Filter by Status
        </label>
        <div className="mt-2">
          <select
            id="status"
            name="status"
            value={filters.employeeStatus}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="block w-full rounded-md border-0 py-1.5 pl-3 pr-10 text-gray-900 dark:text-white ring-1 ring-inset ring-gray-300 dark:ring-gray-700 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 dark:bg-dark-input"
          >
            <option value="">All Statuses</option>
            {/* Map over the provided statuses to create options */}
            {availableStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default UserFilters;