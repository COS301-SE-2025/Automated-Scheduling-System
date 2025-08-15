import React from 'react';
import { Edit } from 'lucide-react';
import type { RoleRecord, AllowedPage } from '../../types/role';

interface RoleTableProps {
  roles: RoleRecord[];
  isLoading: boolean;
  onEdit: (role: RoleRecord) => void;
  onDelete?: (role: RoleRecord) => void;
}

const RoleTable: React.FC<RoleTableProps> = ({ roles, isLoading, onEdit }) => {
  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-secondary"></div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="mt-6 text-center py-10 bg-white dark:bg-dark-input rounded-md shadow">
        <p className="text-custom-third dark:text-dark-secondary">No roles found.</p>
      </div>
    );
  }

  return (
    <div className="mt-6 flow-root">
      <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-dark-input">
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary sm:pl-6">Role Name</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Description</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Permissions</th>
                  <th className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="font-medium text-gray-900 dark:text-white">{role.name}</div>
                      {role.isSystem && <div className="text-xs text-gray-500">System role</div>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{role.description || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                      <div className="flex flex-wrap gap-1">
                        {Array.from(new Set<AllowedPage>([...role.permissions, 'dashboard', 'main-help'] as AllowedPage[])).map((p) => (
                          <span
                            key={p}
                            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 bg-gray-100 text-gray-800 dark:bg-dark-accent dark:text-dark-primary"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        type="button"
                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary p-1"
                        onClick={() => onEdit(role)}
                        title="Edit Role"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleTable;
