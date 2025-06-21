import React, { useState, useEffect } from 'react';
import type { User, Role } from '../../types/user';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  // onSave now only needs to send the fields that can actually be changed.
  onSave: (data: { userId: number; role: Role }) => void;
  user?: User; // The full, hydrated user object from the API
  title: string;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, user, title }) => {
  // The form state only needs to track the fields that are editable.
  const [editableRole, setEditableRole] = useState<Role>('User');

  useEffect(() => {
    // When the user prop changes (i.e., when the modal opens with a user),
    // set the form's state to match that user's role.
    if (user) {
      setEditableRole(user.role);
    } else {
      // If creating a new user, reset to default.
      // Note: Creating a brand new user is now a more complex "onboarding" flow.
      setEditableRole('User');
    }
  }, [user, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEditableRole(e.target.value as Role);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return; // Should not be able to save without a user context
    onSave({
      userId: user.userId,
      role: editableRole,
    });
  };

  if (!isOpen) return null;

  // A helper component to render read-only fields cleanly.
  const ReadOnlyField = ({ label, value }: { label: string; value: string | number | null | undefined }) => (
    <div>
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400">{label}</label>
      <p className="mt-1 text-base text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
        {value ?? 'N/A'}
      </p>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
      <div className="relative bg-white dark:bg-dark-input rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Modal Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-200 dark:border-gray-700 rounded-t">
          <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 ...">
            {/* Close Icon SVG */}
          </button>
        </div>
        
        {/* Form Body */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {user ? (
              <>
                {/* Read-Only Information from Employee Master Record */}
                <ReadOnlyField label="Full Name" value={user.name} />
                {/* <ReadOnlyField label="Username" value={user.username} /> */}
                <ReadOnlyField label="Email" value={user.email} />
                <ReadOnlyField label="Employee Number" value={user.employeeNumber} />
                <ReadOnlyField label="Employee Status" value={user.status} />
                <ReadOnlyField label="Termination Date" value={user.terminationDate} />

                <hr className="border-gray-300 dark:border-gray-600 my-2" />

                {/* Editable Application-Specific Field */}
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-custom-primary dark:text-dark-secondary">
                    Application Role
                  </label>
                  <select
                    id="role"
                    name="role"
                    value={editableRole}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border border-gray-300 dark:border-gray-600 py-2 pl-3 pr-10 text-base focus:border-custom-secondary focus:outline-none focus:ring-custom-secondary sm:text-sm dark:bg-dark-input dark:text-white"
                  >
                    <option value="Admin">Admin</option>
                    <option value="Manager">Manager</option>
                    <option value="User">User</option>
                  </select>
                </div>
              </>
            ) : (
              <p>No user data available.</p>
            )}
          </div>
          
          {/* Modal Footer */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border ...">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 rounded-md ...">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;