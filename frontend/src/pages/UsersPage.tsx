import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle } from 'lucide-react';
import UserTable from '../components/users/UserTable';
import UserFilters from '../components/users/UserFilters';
import MainLayout from '../layouts/MainLayout';
import UserModal from '../components/users/UserModal';
import * as userService from '../services/userService';
import * as competencyService from '../services/competencyService';
import { useAuth } from '../hooks/useAuth';
import type { User, AddUserData, UpdateUserData } from '../types/user';
import { ApiError } from '../services/api';
import { getAllRoles } from '../services/roleService';
import Button from '../components/ui/Button';
import type { Competency } from '../types/competency';
import { getAllJobPositions, type JobPosition } from '../services/jobPositionService';

const UsersPage: React.FC = () => {
    // Page-level state
    const { isAuthenticated } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [pageError, setPageError] = useState<string | null>(null);

    // State for filtering and search
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({
        role: '',
        employeeStatus: '',
    });

    // State for controlling the modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [editingUser, setEditingUser] = useState<User | undefined>(undefined);
    const [modalApiError, setModalApiError] = useState<string | null>(null);
    const [allRoleNames, setAllRoleNames] = useState<string[]>([]);
    const [allCompetencies, setAllCompetencies] = useState<Competency[]>([]);
    const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
    const [expandedUserPanel, setExpandedUserPanel] = useState<{ userId: number; panel: 'competencies' | 'positions' } | null>(null);

    // Fetch initial user data
    useEffect(() => {
        if (!isAuthenticated) {
            setIsLoading(false);
            setPageError('You must be logged in to view users.');
            return;
        }
        const fetchUsers = async () => {
            setIsLoading(true);
            setPageError(null);
            try {
                const [apiUsers, roles, comps] = await Promise.all([
                    userService.getAllUsers(),
                    getAllRoles().catch(() => []),
                    competencyService.getAllCompetencies().catch(() => [])
                ]);
                setUsers(apiUsers);
                setAllCompetencies(comps);
                if (roles && roles.length > 0) {
                    setAllRoleNames(roles.map(r => r.name).sort());
                } else {
                    // fallback to roles present among users
                    const derived = Array.from(new Set(apiUsers.map(u => u.role)));
                    setAllRoleNames(derived.sort());
                }
                const positions = await getAllJobPositions().catch(() => []);
                setJobPositions(positions);
            } catch (err) {
                if (err instanceof ApiError) {
                    setPageError(err.data?.error || err.message);
                } else if (err instanceof Error) {
                    setPageError(err.message);
                } else {
                    setPageError('An unknown error occurred while fetching users.');
                }
            } finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [isAuthenticated]);

    const availableFilterOptions = useMemo(() => {
        const statuses = new Set(users.map(user => user.employeeStatus));
        return {
            roles: allRoleNames,
            statuses: Array.from(statuses).sort(),
        };
    }, [users, allRoleNames]);

    const filteredUsers = useMemo(() => {
        let result = users;
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(user =>
                user.name.toLowerCase().includes(term) ||
                user.username.toLowerCase().includes(term) ||
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

    // --- MODAL HANDLER FUNCTIONS ---

    const handleOpenAddModal = () => {
        setModalMode('add');
        setEditingUser(undefined);
        setModalApiError(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (user: User) => {
        setModalMode('edit');
        setEditingUser(user);
        setModalApiError(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingUser(undefined);
    };

    const handleSaveUser = async (
        data: AddUserData | UpdateUserData,
        options: { userId?: number }
    ) => {
        setModalApiError(null);

        try {
            if (modalMode === 'add') {
                const newUser = await userService.addUser(data as AddUserData);
                setUsers(prevUsers => [newUser, ...prevUsers]);
            } else if (modalMode === 'edit' && options.userId) {
                const updatedUser = await userService.updateUser(options.userId, data as UpdateUserData);
                setUsers(prevUsers =>
                    prevUsers.map(u => (u.id === options.userId ? updatedUser : u))
                );
            }
            handleCloseModal();
        } catch (err) {
            if (err instanceof ApiError) {
                setModalApiError(err.data?.error || err.message);
            } else if (err instanceof Error) {
                setModalApiError(err.message);
            } else {
                setModalApiError('An unknown error occurred. Please try again.');
            }
        }
    };

    // --- FILTER/SEARCH HANDLERS ---
    const handleSearch = (term: string) => setSearchTerm(term);
    const handleFilterChange = (name: string, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    if (pageError) {
        return (
            <MainLayout pageTitle='Users List'>
                <div className="text-center py-10">
                    <h1 className="text-2xl font-semibold text-red-600">Error</h1>
                    <p className="mt-2 text-custom-third">{pageError}</p>
                </div>
            </MainLayout>
        );
    }

    return (
        <MainLayout pageTitle="Users" helpText="Manage user accounts, view details, competencies, and update roles and access permissions for your organization.">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">User Management</h1>
                        <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">
                            Add, view, and manage user roles in the system.
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <Button type="button" onClick={handleOpenAddModal} variant="primary">
                            <PlusCircle size={20} className="inline-block mr-2" />
                            New User
                        </Button>
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
                    onDelete={(user) => alert(`Delete functionality for ${user.name} is not yet implemented.`)}
                    allCompetencies={allCompetencies}
                    jobPositions={jobPositions}
                    expandedUserPanel={expandedUserPanel}
                    onTogglePanel={(userId, panel) =>
                        setExpandedUserPanel(prev =>
                            prev && prev.userId === userId && prev.panel === panel
                                ? null
                                : { userId, panel }
                        )
                    }
                />
            </div>

            <UserModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveUser}
                mode={modalMode}
                user={editingUser}
                apiError={modalApiError}
            />
        </MainLayout>
    );
};

export default UsersPage;