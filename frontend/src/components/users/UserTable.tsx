import React from 'react';
import type { User } from '../../types/user';

interface UserTableProps {
  users: User[]; 
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserTable: React.FC<UserTableProps> = ({ users, isLoading, onEdit, onDelete }) => {

  const getStatusClass = (employeeStatus: string): string => {
    const lowerCaseStatus = (employeeStatus || '').toLowerCase();
    if (lowerCaseStatus.includes('active')) {
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    }
    if (lowerCaseStatus.includes('terminated') || lowerCaseStatus.includes('inactive') || lowerCaseStatus.includes('resigned')) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    }
    if (lowerCaseStatus.includes('leave') || lowerCaseStatus.includes('pending')) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    }
    // Default fallback for any other status
    return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-secondary"></div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="mt-6 text-center py-10 bg-white dark:bg-dark-input rounded-md shadow">
        <p className="text-custom-third dark:text-dark-secondary">No users found.</p>
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
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary sm:pl-6">
                    Name 
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                    Contact Email
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                    Employee Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">
                    App Role
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                {users.map((user) => (
                  <tr key={user.userId}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                      <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                      {/* <div className="text-gray-500 dark:text-gray-400">{user.username}</div> */}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {user.email}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold leading-5 ${getStatusClass(user.employeeStatus)}`}>
                        {user.employeeStatus ?? 'N?A'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                      {user.role}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <button
                        type="button"
                        className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary mr-4"
                        onClick={() => onEdit(user)}
                      >
                        Edit User
                      </button>
                      {/* <button
                        type="button"
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => onDelete(user)}
                      >
                        Delete
                      </button> */}
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

export default UserTable;