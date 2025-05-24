import React, { useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { useSearchParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../utils/validation';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';
import MessageBox from '../ui/MessageBox';
import { useAuth } from '../../hooks/useAuth';

const ForgotPasswordForm: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const { forgotPassword, isLoading: authIsLoading, error: authError, clearError } = useAuth();

    const submittedEmail = searchParams.get('email');
    const successMessage = searchParams.get('message');
    const isSuccess = submittedEmail && successMessage;

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });


    useEffect(() => {
        if (authError && isSuccess) {
            setSearchParams({});
        }
    }, [authError, isSuccess, setSearchParams]);

    const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
        clearError();

        try {
            const response = await forgotPassword(data.email);

            setSearchParams({
                email: data.email,
                message: response.message || "Reset link sent successfully"
            });
            reset();
        } catch (err) {
            if (err instanceof Error) {
                console.error('Forgot password failed:', err.message);

                setSearchParams({
                    email: data.email,
                    message: "If an account with this email exists, a password reset link has been sent."
                });
                reset();
            } else {
                console.error('Forgot password failed with an unknown error:', err);
            }
        }
    };

    const handleBackToLogin = () => {
        setSearchParams({});
    };

    const handleBackToForgotPassword = () => {
        setSearchParams({});
    };

    if (isSuccess) {
        return (
            <MessageBox title="Check your email" type="success">
                <p>
                    We've sent a password reset link to <span className="font-medium">{submittedEmail}</span>.
                    Please check your inbox and follow the instructions.
                </p>
                <p className="mt-2 text-sm">
                    {successMessage}
                </p>
                <p className="mt-2 text-sm text-custom-third">
                    If you don't receive an email within a few minutes, please check your spam folder or verify that you entered the correct email address.
                </p>
                <div className="mt-6">
                    <FormLink to="/forgot-password" onClick={handleBackToForgotPassword}>
                        Return to forgot password
                    </FormLink>
                </div>
                <div className="mt-6">
                    <FormLink to="/login" onClick={handleBackToLogin}>
                        Return to login
                    </FormLink>
                </div>
            </MessageBox>
        );
    }

    return (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
            {authError && <MessageBox type="error" title="Error">{authError}</MessageBox>}
            <div>
                <p className="mt-1 text-sm text-custom-secondary">
                    Enter your email address and we'll send you a link to reset your password.
                </p>
            </div>

            <FormInput
                id="email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
            />

            <div>
                <FormButton type="submit" disabled={isSubmitting || authIsLoading}>
                    {isSubmitting || authIsLoading ? 'Sending...' : 'Send reset link'}
                </FormButton>
            </div>
            <div className="text-center">
                <p className="text-sm text-custom-third">
                    Remember your password?{' '}
                    <FormLink to="/login">
                        Back to login
                    </FormLink>
                </p>
            </div>
        </FormContainer>
    );
};

export default ForgotPasswordForm;