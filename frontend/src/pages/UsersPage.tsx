import React, { useState, useEffect } from 'react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';

import type { ApiUser } from '../types/auth.types'; 
import UsersLayout from '../layouts/UsersLayout';
import * as userService from '../services/userService'; 
import { useAuth } from '../hooks/useAuth'; 

export type UserStatus = "Active" | "Inactive" | "Pending";


interface DisplayUser extends ApiUser {
  name: string;
  role: string;
  status: UserStatus; 
  lastLogin: string | null;
}

const UsersPage: React.FC = () => {
  const { isAuthenticated } = useAuth(); 
  const [users, setUsers] = useState<DisplayUser[]>([]); 
  const [filteredUsers, setFilteredUsers] = useState<DisplayUser[]>([]);
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
      setError("You must be logged in to view users."); 
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUsers = await userService.getAllUsers();
        const displayUsers: DisplayUser[] = apiUsers.map(apiUser => ({
          ...apiUser,
          name: apiUser.username, 
          role: 'User', 
          status: 'Active', 
          lastLogin: null, 
        }));
        setUsers(displayUsers);
      } catch (err) {
        console.error('Error fetching users:', err);
        if (err instanceof Error) {
          setError(err.message || 'Failed to fetch users.');
        } else {
          setError('An unknown error occurred while fetching users.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [isAuthenticated]); 
  
  useEffect(() => {
    let result = users;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(term) || // name is now derived from username
        user.email.toLowerCase().includes(term)
      );
    }

    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }

    if (filters.status) {
      result = result.filter(user => user.status === filters.status);
    }

    setFilteredUsers(result);
  }, [users, searchTerm, filters]);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (name: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [name]: value
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
              A list of all users in the system. (Note: Role, Status, Last Login are currently placeholder values)
            </p>
          </div>
          {}
        </div>

        <UserFilters
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={filters}
        />

        <UserTable
          
          users={filteredUsers}
          isLoading={isLoading}
          onEdit={() => alert("Edit functionality to be implemented with API.")} // Placeholder
          onDelete={() => alert("Delete functionality to be implemented with API.")} // Placeholder
        />
      </div>
    </UsersLayout>
  );
};

export default UsersPage;