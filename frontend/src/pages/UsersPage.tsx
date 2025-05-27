// src/pages/UsersPage.tsx
import React, { useState, useEffect } from 'react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';
// UserModal and DeleteConfirmationModal will need updates if you implement add/edit/delete with API
// For now, we focus on displaying users from the API.
// import UserModal from '../components/users/UserModal';
// import DeleteConfirmationModal from '../components/users/DeleteConfirmationModal';
import type { ApiUser } from '../types/auth.types'; // Use the new ApiUser type
import UsersLayout from '../layouts/UsersLayout';
import * as userService from '../services/userService'; // Import the new service
import { useAuth } from '../hooks/useAuth'; // To ensure user is authenticated

export type UserStatus = "Active" | "Inactive" | "Pending";

// Define a type for display purposes if you want to add mock/default values
// for fields not coming from the API (role, status, lastLogin)
interface DisplayUser extends ApiUser {
  name: string;
  role: string;
  status: UserStatus; // <--- Use the specific UserStatus type
  lastLogin: string | null;
}

const UsersPage: React.FC = () => {
  const { isAuthenticated } = useAuth(); // Check if user is authenticated to even try fetching
  const [users, setUsers] = useState<DisplayUser[]>([]); // State for users with all display fields
  const [filteredUsers, setFilteredUsers] = useState<DisplayUser[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    role: '', // Role and status filters might not work perfectly if data is mocked
    status: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null); // For API errors

  // Modal states (keep for now, but functionality will change)
  // const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  // const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  // const [currentUser, setCurrentUser] = useState<DisplayUser | undefined>(undefined);

  // Fetch users data
  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setError("You must be logged in to view users."); // Or rely on ProtectedRoute to redirect
      return;
    }

    const fetchUsers = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUsers = await userService.getAllUsers();
        // Map ApiUser to DisplayUser, adding mock data for missing fields
        const displayUsers: DisplayUser[] = apiUsers.map(apiUser => ({
          ...apiUser,
          name: apiUser.username, // Map username to name
          role: 'User', // Mock data - API doesn't provide this yet
          status: 'Active', // Mock data
          lastLogin: null, // Mock data or derive from apiUser.UpdatedAt if available & desired
        }));
        setUsers(displayUsers);
        // setFilteredUsers(displayUsers); // This will be handled by the next useEffect
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
  }, [isAuthenticated]); // Re-fetch if auth state changes (e.g., after login)

  // Apply search and filters
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

  // CRUD operations will need to be updated to call API endpoints
  // For now, Add/Edit/Delete will be non-functional or operate on local mock data only.
  // const handleAddUser = () => { /* ... */ };
  // const handleEditUser = (user: DisplayUser) => { /* ... */ };
  // const handleDeleteUser = (user: DisplayUser) => { /* ... */ };
  // const saveNewUser = (userData: Omit<DisplayUser, 'id' | 'lastLogin'>) => { /* ... */ };
  // const updateUser = (userData: Omit<DisplayUser, 'id' | 'lastLogin'>) => { /* ... */ };
  // const confirmDeleteUser = () => { /* ... */ };

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
          {/* <div className="mt-4 sm:ml-16 sm:mt-0 sm:flex-none">
            <button
              type="button"
              // onClick={handleAddUser}
              disabled // Disable until implemented with API
              className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary disabled:opacity-50"
            >
              Add user
            </button>
          </div> */}
        </div>

        <UserFilters
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          filters={filters}
        />

        <UserTable
          // users prop now expects DisplayUser[]
          // The UserTable component itself uses a 'User' type which we might need to align
          // For now, let's cast, assuming UserTable's 'User' type is compatible enough
          // or update UserTable to accept DisplayUser or a more generic user type.
          users={filteredUsers}
          isLoading={isLoading}
          onEdit={() => alert("Edit functionality to be implemented with API.")} // Placeholder
          onDelete={() => alert("Delete functionality to be implemented with API.")} // Placeholder
        />
      </div>

      {/* Modals are commented out or disabled until full API integration for CRUD */}
      {/* <UserModal ... /> */}
      {/* <DeleteConfirmationModal ... /> */}
    </UsersLayout>
  );
};

export default UsersPage;