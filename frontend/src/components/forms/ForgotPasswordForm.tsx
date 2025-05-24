import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { forgotPasswordSchema, type ForgotPasswordFormData } from '../../utils/validation';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';
import MessageBox from '../ui/MessageBox';
import { useAuth } from '../../hooks/useAuth';

const ForgotPasswordForm: React.FC = () => {
    const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
    const [apiMessage, setApiMessage] = useState<string | null>(null);
    const { forgotPassword, isLoading: authIsLoading, error: authError, clearError } = useAuth();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<ForgotPasswordFormData>({
        resolver: zodResolver(forgotPasswordSchema),
    });
    

    const onSubmit: SubmitHandler<ForgotPasswordFormData> = async (data) => {
        clearError();
        setApiMessage(null);
        try {
            const response = await forgotPassword(data.email);
            setApiMessage(response.message);
            setSubmittedEmail(data.email);
            reset();
        } catch (err) {
            if (err instanceof Error) {
                console.error('Forgot password failed:', err.message);
                setApiMessage("If an account with this email exists, a password reset link has been sent.");
                setSubmittedEmail(data.email);
                reset();
            } else {
                console.error('Forgot password failed with an unknown error:', err);
            }
        }
    };
    
    if (submittedEmail && apiMessage) {
        console.log("here");
        return (
            <MessageBox title="Check your email" type="success">
                <p>
                    We've sent a password reset link to <span className="font-medium">{submittedEmail}</span>.
                    Please check your inbox and follow the instructions.
                </p>
                <p className="mt-2 text-sm">
                    {apiMessage}
                </p>
                <p className="mt-2 text-sm text-custom-third">
                    If you don't receive an email within a few minutes, please check your spam folder or verify that you entered the correct email address.
                </p>
                <div className="mt-6">
                    <FormLink to="/login" onClick={() => { setSubmittedEmail(null); setApiMessage(null); }}>
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