import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { resetPasswordSchema, type ResetPasswordFormData } from '../../utils/validation';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import { useAuth } from '../../hooks/useAuth';
import MessageBox from '../ui/MessageBox';
import apiClient from '../../services/api';

interface ResetPasswordFormProps {
    resetToken: string;
}

const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ resetToken }) => {
    const { error, clearError } = useAuth();
    const navigate = useNavigate();

    const [isLoading, setIsLoading] = useState(true);
    const [isTokenValidated, setIsTokenValidated] = useState(false);


    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<ResetPasswordFormData>({
        resolver: zodResolver(resetPasswordSchema),
    });

    interface ResetPasswordResponse {
        message: string;
    }

    const validateResetLink = async (resetToken: string): Promise<ResetPasswordResponse> => {
        return await apiClient<{ message: string }>(`reset-password/${resetToken}`, {
            method: 'GET',
            isAuthRequest: false,
        });
    };

    const resetPassword = async (email: string, password: string, confirmPassword: string): Promise<ResetPasswordResponse> => {
        return await apiClient<{ message: string }>('reset-password', {
            method: 'POST',
            data: { email, password, confirmPassword },
            isAuthRequest: false,
        });
    };

    // Validate the reset token on page load
    useEffect(() => {
        const validateToken = async () => {
            setIsLoading(true);
            clearError();
            try {
                if (!resetToken) {
                    throw new Error('Reset token is missing.');
                }
                const isValid = await validateResetLink(resetToken);
                console.log("Token validation response:", isValid);
                setIsTokenValidated(true);

            } catch (err) {
                console.error('Invalid or expired reset token:', err);
            } finally {
                setIsLoading(false);
            }
        };

        validateToken();

    }, [resetToken]);


    // const onSubmit: SubmitHandler<ResetPasswordFormData> = async () => {
    //     alert("HEY");
    // }
    const onSubmit: SubmitHandler<ResetPasswordFormData> = async (data) => {
        if (!isTokenValidated) return;
        clearError();
        try {
            if (!resetToken) {
                throw new Error('Reset token is missing.');
            }
            const returnValue = await resetPassword(data.email, data.password, data.confirmPassword); // Pass resetToken to the API
            console.log(returnValue);
            navigate('/login');
        } catch (err) {
            if (err instanceof Error) {
                console.error('Reset password failed:', err.message);
            } else {
                console.error('Reset password failed with an unknown error:', err);
            }
        }
    };

    // Show a loading state while validating the token
    if (!isTokenValidated || isLoading) {
        return <div>Could not validate Reset token...</div>;
    }
    // console.log(errors);

    if (error) {
        return (
            <MessageBox type="error" title="Invalid Token">
                {error || 'The reset token is invalid or has expired. Please request a new password reset.'}
            </MessageBox>
        );
    }

    return (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
            {error && <MessageBox type="error" title="Reset Password Failed">{error}</MessageBox>}

            {/* Email */}
            <FormInput
                id="email"
                type="email"
                label="Email"
                placeholder="john.doe@example.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
            />

            {/* Password */}
            <FormInput
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("password")}
                error={errors.password?.message}
            />

            {/* Confirm Password */}
            <FormInput
                id="confirmPassword"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
            />
            <div>
                <FormButton type="submit" >
                    {isSubmitting || isLoading ? 'Resetting Password...' : 'Reset Password'}
                </FormButton>
            </div>
        </FormContainer>
    );
};

export default ResetPasswordForm;