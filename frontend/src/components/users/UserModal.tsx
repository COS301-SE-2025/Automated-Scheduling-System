import React, { useState, useEffect } from 'react';
import type { User, Role, AddUserData, UpdateUserData } from '../../types/user';

interface InputFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'email' | 'password';
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
}

interface ReadOnlyFieldProps {
  label: string;
  value: string | number | null | undefined;
}

interface UserModalProps {
  mode: 'add' | 'edit';
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: AddUserData | UpdateUserData, userId?: number) => void;
  user?: User; 
}

const UserModal: React.FC<UserModalProps> = ({ mode, isOpen, onClose, onSave, user }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'User' as Role,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setError(''); 
      if (mode === 'edit' && user) {
        setFormData({
          name: user.name, 
          email: user.email,
          role: user.role,
          password: '', 
          confirmPassword: '',
        });
      } else {
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
          role: 'User',
        });
      }
    }
  }, [isOpen, mode, user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'add') {
      if (!formData.password) {
        setError('Password is required.');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      const addPayload: AddUserData = {
        username: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      onSave(addPayload);
    } else if (mode === 'edit' && user) {
      const updatePayload: UpdateUserData = {};
      if (formData.role !== user.role) updatePayload.role = formData.role;
      if (formData.email !== user.email) updatePayload.email = formData.email;

      if (Object.keys(updatePayload).length > 0) {
        onSave(updatePayload, user.userId);
      } else {
        onClose(); // Close if no changes were made
      }
    }
  };

  if (!isOpen) return null;

  const title = mode === 'add' ? 'Add New User' : 'Edit User';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
      <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-dark-input rounded-lg shadow-xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 rounded-t">
          <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">{title}</h3>
          <button type="button" onClick={onClose} className="p-1.5 text-gray-400 bg-transparent rounded-lg hover:bg-gray-200 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-white">
            <span className="sr-only">Close modal</span>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && <div className="p-3 text-sm font-medium text-red-800 bg-red-100 dark:bg-red-900/20 dark:text-red-300 rounded-md">{error}</div>}

            {mode === 'edit' && user && (
              <>
                <ReadOnlyField label="Full Name" value={user.name} />
              </>
            )}

            {mode === 'add' && (
              <>
                <InputField label="Username" name="username" value={formData.name} onChange={handleChange} required autoComplete="off" />
                <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </>
            )}
            
            {mode === 'edit' && (
              <InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} required />
            )}

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">Application Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white">
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>
            
            {mode === 'add' && (
              <>
                <InputField label="Password" name="password" type="password" value={formData.password} onChange={handleChange} required autoComplete="new-password" />
                <InputField label="Confirm Password" name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} required autoComplete="new-password" />
              </>
            )}
            
            {mode === 'edit' && user && formData.email !== user.email && (
              <div className="p-3 text-sm text-yellow-800 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300 rounded-md">
                <strong>Warning:</strong> Changing an email address may trigger a confirmation notice.
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end p-4 space-x-2 border-t border-gray-200 dark:border-gray-700 rounded-b">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-custom-primary bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary dark:bg-dark-input dark:text-dark-primary dark:border-gray-600 dark:hover:bg-gray-700">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-custom-secondary rounded-md shadow-sm hover:bg-custom-third focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


const InputField: React.FC<InputFieldProps> = ({ label, name, type = 'text', value, onChange, required = false, autoComplete = 'off' }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">{label}</label>
     <div className="mt-1">
      <input
        type={type}
        name={name}
        id={name}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-custom-secondary sm:text-sm sm:leading-6 dark:bg-gray-700 dark:text-gray-200 dark:ring-gray-600 dark:placeholder:text-gray-400 dark:focus:ring-custom-secondary"
       />
    </div>
  </div>
  );

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value }) => (
  <div>
    <label className="block text-sm font-medium text-gray-500 dark:text-dark-secondary">{label}</label>
    <p className="mt-1 w-full p-2 text-base bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md">{value ?? 'N/A'}</p>
  </div>
);

export default UserModal;