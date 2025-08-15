import React, { useEffect, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { addUserSchema, type AddUserFormData } from '../../utils/validation';
import type { User, AddUserData, UpdateUserData } from '../../types/user';
import { ApiError } from '../../services/api';

import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import MessageBox from '../ui/MessageBox';
import FormSelect from '../ui/FormSelect';
import { getAllRoles } from '../../services/roleService';

interface ReadOnlyFieldProps {
    label: string;
    value: string | number | null | undefined;
}

const ReadOnlyField: React.FC<ReadOnlyFieldProps> = ({ label, value }) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 dark:text-dark-secondary">{label}</label>
        <p className="mt-1 w-full p-2 text-base bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-md">{value ?? 'N/A'}</p>
    </div>
);


interface UserModalProps {
    mode: 'add' | 'edit';
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: AddUserData | UpdateUserData, options: { userId?: number }) => Promise<void>;
    user?: User;
    apiError?: string | null;
}

const UserModal: React.FC<UserModalProps> = ({ mode, isOpen, onClose, onSave, user }) => {
    const isEditMode = mode === 'edit';

    const [apiError, setApiError] = useState<string | null>(null);
    const [roleOptions, setRoleOptions] = useState<Array<{ value: string; label: string }>>([
        { value: 'User', label: 'User' },
        { value: 'Admin', label: 'Admin' },
    ]);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm<AddUserFormData>({
        resolver: isEditMode ? undefined : zodResolver(addUserSchema),
    });

    useEffect(() => {
        if (isOpen) {
            setApiError(null);
            // Load dynamic roles
            (async () => {
                try {
                    const roles = await getAllRoles();
                    if (roles && roles.length > 0) {
                        setRoleOptions(roles.map(r => ({ value: r.name, label: r.name })));
                    }
                } catch {
                       // if loading fails, do nothing (i.e. keep predefined defualts "User" and "Admin" instead of crashing)
                }
            })();
            if (isEditMode && user) {
                reset({ role: user.role, username: user.username, email: user.email });
            } else {
                reset({ username: '', email: '', password: '', confirmPassword: '', role: 'User' });
            }
        }
    }, [isOpen, isEditMode, user, reset]);

    const onSubmit: SubmitHandler<AddUserFormData> = async (data) => {
        setApiError(null);

        try {
            if (isEditMode && user) {
                const payload: UpdateUserData = { role: data.role };
                await onSave(payload, { userId: user.id });
            } else {
                await onSave(data, {});
            }
        } catch (err) {
            if (err instanceof ApiError) {
                setApiError(err.data?.error || err.message);
            } else if (err instanceof Error) {
                setApiError(err.message);
            } else {
                setApiError('An unknown error occurred.');
            }
            console.error(`Failed to ${mode} user:`, err);
        }
    };

    if (!isOpen) return null;

    const title = isEditMode ? 'Edit User' : 'Add New User';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">{title}</h3>
                    <button type="button" onClick={onClose}  >
                        {/* Close SVG */}
                    </button>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
                    {apiError && <MessageBox type="error" title="Operation Failed">{apiError}</MessageBox>}

                    {isEditMode && user ? (
                        <>
                            <ReadOnlyField label="Full Name" value={user.name} />
                            <ReadOnlyField label="Email Address" value={user.email} />
                            <ReadOnlyField label="Username" value={user.username} />
                        </>
                    ) : (
                        <>
                            <FormInput id="username" label="Username" {...register('username')} error={errors.username?.message} />
                            <FormInput id="email" label="Email Address" type="email" {...register('email')} error={errors.email?.message} />
                        </>
                    )}

                    <FormSelect
                        id="role"
                        label="Application Role"
                        {...register('role')}
                        error={errors.role?.message}
                        options={roleOptions}
                    />

                    {!isEditMode && (
                        <>
                            <FormInput id="password" label="Password" type="password" {...register('password')} error={errors.password?.message} />
                            <FormInput id="confirmPassword" label="Confirm Password" type="password" {...register('confirmPassword')} error={errors.confirmPassword?.message} />
                        </>
                    )}

                    <div className="flex items-center justify-end pt-4 space-x-3">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 ...">
                            Cancel
                        </button>
                        <FormButton type="submit" disabled={isSubmitting} fullWidth={false}>
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </FormButton>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UserModal;