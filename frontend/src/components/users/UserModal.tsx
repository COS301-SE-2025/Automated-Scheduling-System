import React, { useState, useEffect } from 'react';
import type { User } from '../../types/user';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: Omit<User, 'id' | 'lastLogin'>) => void;
  user?: User;
  title: string;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, title }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'User',
    status: 'Active' as 'Active' | 'Inactive' | 'Pending',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      });
    } else {
      setFormData({
        name: '',
        email: '',
        role: 'User',
        status: 'Active' as 'Active' | 'Inactive' | 'Pending',
      });
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white dark:bg-dark-input rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700 rounded-t">
          <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white rounded-lg text-sm p-1.5 ml-auto inline-flex items-center"
          >
            <span className="sr-only">Close</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
                Name
              </label>
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-3 text-base focus:border-custom-secondary focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
                Email
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-3 text-base focus:border-custom-secondary focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white"
              />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
                Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:outline-none focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="User">User</option>
              </select>
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:outline-none focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-custom-primary dark:text-dark-primary bg-white dark:bg-dark-input hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-md shadow-sm text-sm font-medium text-white bg-custom-secondary hover:bg-custom-third focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;