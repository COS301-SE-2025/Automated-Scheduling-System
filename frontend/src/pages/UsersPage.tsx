import React, { useState, useEffect, useMemo } from 'react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';
import UsersLayout from '../layouts/UsersLayout';
import UserModal from '../components/users/UserModal';
import * as userService from '../services/userService';
import { useAuth } from '../hooks/useAuth';
import type { User, AddUserData, UpdateUserData } from '../types/user'; 
import { ApiError } from '../services/api';


const UsersPage: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
  const { isAuthenticated } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    employeeStatus: '',
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
    const statuses = new Set(users.map(user => user.employeeStatus));

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

    if (filters.employeeStatus) {
      result = result.filter(user => user.employeeStatus === filters.employeeStatus);
    }

    return result;
  }, [users, searchTerm, filters]);

  const handleOpenAddModal = () => {
    setModalMode('add');
    setEditingUser(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setModalMode('edit');
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUser(undefined);
  };

    const handleSaveUser = async (
    data: AddUserData | UpdateUserData,
    options: { userId?: number; emailChanged?: boolean }) => {   
      try {
      if (modalMode === 'add') {
        const newUser = await userService.addUser(data as AddUserData);
        setUsers(prevUsers => [newUser, ...prevUsers]);
      } else if (modalMode === 'edit' && options.userId) {
        const updatedUserPartial = await userService.updateUser(options.userId, data as UpdateUserData);
        setUsers(prevUsers =>
          prevUsers.map(u =>
            u.userId === options.userId ? { ...u, ...updatedUserPartial } : u
          )
        );
        if (options.emailChanged) {
          alert('User email has been updated successfully. A confirmation notice would be sent in a real application.');
        }
      }
      handleCloseModal();
    } catch (err) {
      console.error('Failed to save user:', err);
    }
  };

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
            <h1 className="text-2xl ...">Users</h1>
            <p className="mt-2 text-sm ...">A list of all users...</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline ..."
            >
              Add User
            </button>
          </div>
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
          onEdit={handleOpenEditModal} 
          onDelete={(user) => alert(`Deleting user ${user.name}`)}
        />
      </div>

      <UserModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveUser}
        mode={modalMode}
        user={editingUser}
      />
    </UsersLayout>
  );
};

export default UsersPage;