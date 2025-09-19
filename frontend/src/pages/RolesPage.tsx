import React, { useEffect, useMemo, useState } from 'react';
import MainLayout from '../layouts/MainLayout';
import RoleTable from '../components/roles/RoleTable';
import RoleModal from '../components/roles/RoleModal';
import RoleFilters from '../components/roles/RoleFilters';
import { PlusCircle } from 'lucide-react';
import * as roleService from '../services/roleService';
import type { RoleRecord, AddRoleData, AllowedPage } from '../types/role';
import { ApiError } from '../services/api';
import { useAuth } from '../hooks/useAuth';

const ALL_PAGES: { value: AllowedPage; label: string }[] = [
  { value: 'users', label: 'Users' },
  { value: 'roles', label: 'Roles' },
  { value: 'compliance dashboard', label: 'Compliance Dashboard' },
  { value: 'event-definitions', label: 'Event Definitions' },
  { value: 'rules', label: 'Rules' },
  { value: 'competencies', label: 'Competencies' },
];

const RolesPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view'>('add');
  const [activeRole, setActiveRole] = useState<RoleRecord | null>(null);
  const [modalApiError, setModalApiError] = useState<string | null>(null);
  const [modalApiErrorTitle, setModalApiErrorTitle] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      setIsLoading(false);
      setPageError('You must be logged in to view roles.');
      return;
    }
    const fetchRoles = async () => {
      setIsLoading(true);
      setPageError(null);
      try {
        const data = await roleService.getAllRoles();
        setRoles(data);
      } catch (err) {
        if (err instanceof ApiError) setPageError(err.data?.error || err.message);
        else if (err instanceof Error) setPageError(err.message);
        else setPageError('An unknown error occurred while fetching roles.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchRoles();
  }, [isAuthenticated]);

  const filteredRoles = useMemo(() => {
    const term = search.toLowerCase();
    return roles.filter(r =>
      !term || r.name.toLowerCase().includes(term) || (r.description || '').toLowerCase().includes(term)
    );
  }, [roles, search]);

  const openAdd = () => { setModalMode('add'); setActiveRole(null); setModalApiError(null); setModalApiErrorTitle(null); setModalOpen(true); };
  const openEdit = (role: RoleRecord) => { setModalMode('edit'); setActiveRole(role); setModalApiError(null); setModalApiErrorTitle(null); setModalOpen(true); };
  const closeModal = () => setModalOpen(false);

  const handleSave = async (data: AddRoleData) => {
    setModalApiError(null);
    setModalApiErrorTitle(null);
    try {
      // Client-side duplicate name guard for better UX
      const nameExists = roles.some(r => r.name.trim().toLowerCase() === data.name.trim().toLowerCase() && (modalMode !== 'edit' ? true : r.id !== activeRole?.id));
      if (nameExists) {
        setModalApiError('Role name cannot be the same as an existing role. Please choose a different name.');
        setModalApiErrorTitle('Duplicate role name');
        return;
      }
      if (modalMode === 'add') {
        const created = await roleService.createRole(data);
        setRoles(prev => [created, ...prev]);
      } else if (modalMode === 'edit' && activeRole) {
        const updated = await roleService.updateRole(activeRole.id, data);
        setRoles(prev => prev.map(r => r.id === activeRole.id ? updated : r));
      }
      setModalOpen(false);
    } catch (err) {
      if (err instanceof ApiError) {
        const msg = err.data?.error || err.message;
        // If backend returns conflict or similar, map to friendly message
        if (err.status === 409 || /duplicate|exists|already/i.test(msg)) {
          setModalApiError('Role name cannot be the same as an existing role. Please choose a different name.');
          setModalApiErrorTitle('Duplicate role name');
        } else {
          setModalApiError(msg);
          setModalApiErrorTitle('Operation Failed');
        }
      }
      else if (err instanceof Error) setModalApiError(err.message);
      else setModalApiError('An unknown error occurred.');
    }
  };

  if (pageError) {
    return (
      <MainLayout pageTitle='Roles'>
        <div className="text-center py-10">
          <h1 className="text-2xl font-semibold text-red-600">Error</h1>
          <p className="mt-2 text-custom-third">{pageError}</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout pageTitle="Roles">
      <div className="px-4 sm:px-6 lg:px-8 py-8">
  <div className="sm:flex sm:items-center">
          <div className="sm:flex-auto">
            <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">Roles</h1>
            <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">Create custom roles and manage page access permissions.</p>
          </div>
          <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
            <button type="button" onClick={openAdd} className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary">
              <PlusCircle size={20} className="inline-block mr-2" />
              New Role
            </button>
          </div>
        </div>

        <RoleFilters search={search} onSearch={setSearch} />
  <RoleTable roles={filteredRoles} isLoading={isLoading} onEdit={openEdit} />
      </div>

      <RoleModal
        isOpen={modalOpen}
        mode={modalMode}
        onClose={closeModal}
        onSave={handleSave}
        role={activeRole}
        apiError={modalApiError}
  apiErrorTitle={modalApiErrorTitle}
        allPages={ALL_PAGES}
      />
    </MainLayout>
  );
};

export default RolesPage;
