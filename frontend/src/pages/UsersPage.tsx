import React, { useState, useEffect } from 'react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';
import UserModal from '../components/users/UserModal';
import DeleteConfirmationModal from '../components/users/DeleteConfirmationModal';
import type { User } from '../types/user';
import UsersLayout from '../layouts/UsersLayout';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '',
    status: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | undefined>(undefined);

  // Fetch users data
  useEffect(() => {
    // This would be replaced with an actual API call
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        // Mock data for demonstration
        const mockUsers: User[] = [
          { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active', lastLogin: '2023-05-15T10:30:00' },
          { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active', lastLogin: '2023-05-14T09:45:00' },
          { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'Manager', status: 'Inactive', lastLogin: '2023-04-20T14:20:00' },
          { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'User', status: 'Active', lastLogin: '2023-05-10T11:15:00' },
          { id: 5, name: 'Charlie Wilson', email: 'charlie@example.com', role: 'User', status: 'Pending', lastLogin: null },
        ];
        
        setUsers(mockUsers);
        setFilteredUsers(mockUsers);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Apply search and filters
  useEffect(() => {
    let result = users;
    
    // Apply search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(term) || 
        user.email.toLowerCase().includes(term)
      );
    }
    
    // Apply role filter
    if (filters.role) {
      result = result.filter(user => user.role === filters.role);
    }
    
    // Apply status filter
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

  // User CRUD operations
  const handleAddUser = () => {
    setCurrentUser(undefined);
    setIsAddModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setCurrentUser(user);
    setIsEditModalOpen(true);
  };

  const handleDeleteUser = (user: User) => {
    setCurrentUser(user);
    setIsDeleteModalOpen(true);
  };

  const saveNewUser = (userData: Omit<User, 'id' | 'lastLogin'>) => {
    const newUser: User = {
      ...userData,
      id: Math.max(...users.map(u => u.id), 0) + 1,
      lastLogin: null
    };
    
    setUsers(prev => [...prev, newUser]);
    setIsAddModalOpen(false);
  };

  const updateUser = (userData: Omit<User, 'id' | 'lastLogin'>) => {
    if (!currentUser) return;
    
    const updatedUser: User = {
      ...userData,
      id: currentUser.id,
      lastLogin: currentUser.lastLogin
    };
    
    setUsers(prev => prev.map(user => 
      user.id === currentUser.id ? updatedUser : user
    ));
    
    setIsEditModalOpen(false);
  };

  const confirmDeleteUser = () => {
    if (!currentUser) return;
    
    setUsers(prev => prev.filter(user => user.id !== currentUser.id));
    setIsDeleteModalOpen(false);
  };

  return (
    <UsersLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">Users</h1>
            <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">
              A list of all users in the system including their name, email, role and status.
            </p>
          </div>
          <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              onClick={handleAddUser}
              className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary"
            >
              Add user
            </button>
          </div>
        </div>
        
        <UserFilters 
          onSearch={handleSearch} 
          onFilterChange={handleFilterChange}
          filters={filters}
        />
        
        <UserTable 
          users={filteredUsers} 
          isLoading={isLoading}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />
      </div>

      {/* Add User Modal */}
      <UserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={saveNewUser}
        title="Add New User"
      />

      {/* Edit User Modal */}
      <UserModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={updateUser}
        user={currentUser}
        title="Edit User"
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDeleteUser}
        userName={currentUser?.name || ''}
      />
    </UsersLayout>
  );
};

export default UsersPage;