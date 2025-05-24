import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { signupSchema, type SignupFormData } from '../../utils/validation';
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';
import { useAuth } from '../../hooks/useAuth';
import MessageBox from '../ui/MessageBox';

const SignupForm: React.FC = () => {
    const { signup, isLoading: authIsLoading, error: authError, clearError } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const onSubmit: SubmitHandler<SignupFormData> = async (data) => {
        clearError();
        try {
            await signup(data);
            navigate('/dashboard');
        } catch (err) {
            if (err instanceof Error) {
                console.error('Signup failed:', err.message);
            } else {
                console.error('Signup failed with an unknown error:', err);
            }
        }
    };

    return (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
            {authError && <MessageBox type="error" title="Signup Failed">{authError}</MessageBox>}

            <FormInput
                id="name"
                type="text"
                label="Full Name"
                placeholder="John Doe"
                autoComplete="name"
                {...register("name")}
                error={errors.name?.message}
            />

            <FormInput
                id="email"
                type="email"
                label="Email address"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
                error={errors.email?.message}
            />

            <FormInput
                id="password"
                type="password"
                label="Password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("password")}
                error={errors.password?.message}
            />

            <FormInput
                id="confirm-password"
                type="password"
                label="Confirm Password"
                placeholder="••••••••"
                autoComplete="new-password"
                {...register("confirmPassword")}
                error={errors.confirmPassword?.message}
            />

            <div>
                <FormButton type="submit" disabled={isSubmitting || authIsLoading}>
                    {isSubmitting || authIsLoading ? 'Signing up...' : 'Sign up'}
                </FormButton>
            </div>
            <div className="text-center">
                <p className="text-sm text-custom-third">
                    Already have an account?{' '}
                    <FormLink to="/login">
                        Sign in
                    </FormLink>
                </p>
            </div>
        </FormContainer>
    );
};

export default SignupForm;