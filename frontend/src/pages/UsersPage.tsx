import React, { useState, useEffect, useMemo } from 'react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';
import UsersLayout from '../layouts/UsersLayout';
import * as userService from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import type { User } from '../types/user'; 
import { ApiError } from '../services/api';


const UsersPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch users data
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setError('You must be logged in to view users.');
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
     
        const apiUsers = await userService.getAllUsers();
        
        setUsers(apiUsers);

      } catch (err) {
        console.error('Error fetching users:', err);
        if (err instanceof ApiError) {
          setError(err.data?.error || err.message || 'Failed to fetch users.');
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred while fetching users.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated]);

  const availableFilterOptions = useMemo(() => {
    const roles = new Set(users.map(user => user.role));
    const statuses = new Set(users.map(user => user.status));

    return {
      roles: Array.from(roles).sort(),
      statuses: Array.from(statuses).sort(),
    };
  }, [users]); 

  const filteredUsers = useMemo(() => {
    let result = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
        result = result.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }

    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }

    if (filters.status) {
      result = result.filter(user => user.status === filters.status);
    }

    return result;
  }, [users, searchTerm, filters]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (error) {
    return (
      <UsersLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8 text-center">
          <h1 className="text-2xl font-semibold text-red-600 dark:text-red-400">Error</h1>
          <p className="mt-2 text-custom-third dark:text-dark-secondary">{error}</p>
        </div>
      </UsersLayout>
    );
  }

  return (
    <UsersLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">Users</h1>
            <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">
              A list of all users in the system, reflecting their current roles and statuses.
            </p>
          </div>
          {/* Add User button could go here */}
        </div>

         <UserFilters
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={filters}
          availableRoles={availableFilterOptions.roles}
          availableStatuses={availableFilterOptions.statuses}
        />

        <UserTable
          users={filteredUsers}
          isLoading={isLoading}
          onEdit={(user) => alert(`Editing user: ${user.name}`)} // Placeholder
          onDelete={(user) => alert(`Deleting user: ${user.name}`)} // Placeholder
        />
      </div>
    </UsersLayout>
  );
};

export default UsersPage;