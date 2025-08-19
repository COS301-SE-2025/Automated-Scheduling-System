import React, { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import FormInput from '../ui/FormInput';
import Button from '../ui/Button';
import MessageBox from '../ui/MessageBox';
import type { AddRoleData, RoleRecord, AllowedPage } from '../../types/role';

export type RoleFormData = {
  name: string;
  description?: string;
  permissions: AllowedPage[];
};

interface RoleModalProps {
  isOpen: boolean;
  mode: 'add' | 'edit' | 'view';
  onClose: () => void;
  onSave: (data: AddRoleData) => Promise<void>;
  role?: RoleRecord | null;
  apiError?: string | null;
  apiErrorTitle?: string | null;
  allPages: { value: AllowedPage; label: string }[];
}

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, mode, onClose, onSave, role, apiError, apiErrorTitle, allPages }) => {
  const isView = mode === 'view';
  const isEdit = mode === 'edit';

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<RoleFormData>({
    mode: 'onChange',
    defaultValues: { name: '', description: '', permissions: [] },
  });

  useEffect(() => {
    if (!isOpen) return;
    if (role) {
      reset({ name: role.name, description: role.description || '', permissions: (role.permissions ?? []) });
    } else {
      reset({ name: '', description: '', permissions: [] });
    }
  }, [isOpen, role, reset]);

  const onSubmit: SubmitHandler<RoleFormData> = async (data) => {
    let perms = data.permissions;
    if ((role?.name === 'Admin' || data.name === 'Admin') && !perms.includes('roles' as AllowedPage)) {
      perms = [...perms, 'roles' as AllowedPage];
    }
    await onSave({ name: data.name, description: data.description, permissions: perms });
  };

  const permissions = watch('permissions');
  const togglePerm = (p: AllowedPage) => {
    const set = new Set(permissions);
    if (set.has(p)) set.delete(p); else set.add(p);
    setValue('permissions', Array.from(set));
  };

  if (!isOpen) return null;

  const title = isView ? 'View Role' : isEdit ? 'Edit Role' : 'Add New Role';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
      <div className="relative w-full max-w-xl mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">{title}</h3>
          <button type="button" onClick={onClose}>
            <span className="sr-only">Close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
          {apiError && <MessageBox type="error" title={apiErrorTitle || 'Operation Failed'}>{apiError}</MessageBox>}

          <FormInput id="name" label="Role Name" disabled={isView} {...register('name', { required: 'Name is required' })} error={errors.name?.message} />
          <FormInput id="description" label="Description" disabled={isView} {...register('description')} />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-secondary mb-2">Permissions</label>
           
            <div className="mb-2 flex flex-wrap gap-2">
                {['dashboard', 'calendar', 'events', 'main-help'].map((p) => (
                <span key={p} className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-dark-accent dark:text-dark-primary">
                  {p}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {allPages.map(p => {
                const isAdminRole = role?.name === 'Admin';
                const isRolesPerm = p.value === 'roles';
                const disabled = isView || (isAdminRole && isRolesPerm);
                return (
                  <label key={p.value} className={`flex items-center space-x-2 p-2 rounded border dark:border-gray-700 ${disabled ? 'opacity-70' : 'hover:bg-gray-50 dark:hover:bg-dark-accent/40'}`}>
                    <input type="checkbox" disabled={disabled} checked={permissions.includes(p.value)} onChange={() => togglePerm(p.value)} />
                    <span className="text-sm text-gray-800 dark:text-dark-primary bg-gray-100 dark:bg-dark-accent/40 rounded px-1.5 py-0.5">{p.label}</span>
                  </label>
                );
              })}
            </div>
            {errors.permissions && <p className="mt-1 text-sm text-red-600">{errors.permissions.message}</p>}
          </div>

          <div className="flex items-center justify-end pt-4 space-x-3">
            <Button type="button" onClick={onClose} disabled={isSubmitting} variant="outline">
              Close
            </Button>
            {!isView && (
              <Button type="submit" disabled={isSubmitting} variant="primary">
                {isSubmitting ? 'Saving...' : (isEdit ? 'Save Changes' : 'Create Role')}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;
