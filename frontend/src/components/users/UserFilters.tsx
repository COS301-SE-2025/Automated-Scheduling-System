import React, { useState } from 'react';

interface UserFiltersProps {
  onSearch: (term: string) => void;
  onFilterChange: (name: string, value: string) => void;
  filters: {
    role: string;
    status: string;
  };
}

const UserFilters: React.FC<UserFiltersProps> = ({ onSearch, onFilterChange, filters }) => {
  const [searchInput, setSearchInput] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    onSearch(value);
  };

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = e.target;
    onFilterChange(name, value);
  };

  const clearFilters = () => {
    setSearchInput('');
    onSearch('');
    onFilterChange('role', '');
    onFilterChange('status', '');
  };

  const roleOptions = ['', 'Admin', 'Manager', 'User'];
  const statusOptions = ['', 'Active', 'Inactive', 'Pending'];

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="col-span-1 sm:col-span-2">
        <label htmlFor="search" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
          Search
        </label>
        <div className="mt-1 relative rounded-md shadow-sm">
          <input
            type="text"
            name="search"
            id="search"
            value={searchInput}
            onChange={handleSearchChange}
            className="block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-3 text-base focus:border-custom-secondary focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white h-[38px]"
            placeholder="Search by name or email"
          />
        </div>
      </div>

      <div>
        <label htmlFor="role" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
          Role
        </label>
        <select
          id="role"
          name="role"
          value={filters.role}
          onChange={handleFilterChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:outline-none focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white h-[38px]"
        >
          {roleOptions.map(role => (
            <option key={role} value={role}>
              {role || 'All Roles'}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="status" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
          className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:outline-none focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white h-[38px]"
        >
          {statusOptions.map(status => (
            <option key={status} value={status}>
              {status || 'All Statuses'}
            </option>
          ))}
        </select>
      </div>

      {(searchInput || filters.role || filters.status) && (
        <div className="col-span-1 sm:col-span-2 lg:col-span-4 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-custom-primary dark:text-dark-primary bg-white dark:bg-dark-input hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary"
          >
            Clear Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default UserFilters;