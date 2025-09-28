import React from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import MessageBox from '../ui/MessageBox';

const changePasswordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

const ChangePasswordForm: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const [success, setSuccess] = React.useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ChangePasswordFormData>({
        resolver: zodResolver(changePasswordSchema),
    });

    const onSubmit: SubmitHandler<ChangePasswordFormData> = async (data) => {
        setError(null);
        setIsLoading(true);

        try {
            // TODO: Replace with actual API call to change password
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentPassword: data.currentPassword,
                    newPassword: data.newPassword,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to change password');
            }

            setSuccess(true);
            reset();
            
            // Redirect to profile after success
            setTimeout(() => {
                navigate('/profile');
            }, 2000);

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unexpected error occurred');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (success) {
        return (
            <MessageBox title="Password Changed Successfully" type="success">
                <p>Your password has been updated successfully.</p>
                <p className="mt-2 text-sm">You will be redirected to your profile shortly.</p>
            </MessageBox>
        );
    }

    return (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
            {error && <MessageBox type="error" title="Error">{error}</MessageBox>}

            <FormInput
                id="currentPassword"
                type="password"
                label="Current Password"
                placeholder="Enter your current password"
                autoComplete="current-password"
                {...register("currentPassword")}
                error={errors.currentPassword?.message}
            />

            <FormInput
                id="newPassword"
                type="password"
                label="New Password"
                placeholder="Enter your new password"
                autoComplete="new-password"
                {...register("newPassword")}
                error={errors.newPassword?.message}
            />

            <FormInput
                id="confirmPassword"
                type="password"
                label="Confirm New Password"
                placeholder="Confirm your new password"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
            />

            <div>
                <FormButton 
                    type="submit" 
                    disabled={isSubmitting || isLoading}
                >
                    {isSubmitting || isLoading ? 'Changing...' : 'Change Password'}
                </FormButton>
            </div>
            
            <div className="text-center">
                <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="text-sm font-medium text-custom-secondary dark:text-dark-third hover:text-custom-third hover:underline"
                >
                    Cancel
                </button>
            </div>
        </FormContainer>
    );
};

export default ChangePasswordForm;