import React from 'react'; // Removed useState
import { useNavigate } from 'react-router-dom';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '../../utils/validation'; // Import schema and type
import FormContainer from '../ui/FormContainer';
import FormInput from '../ui/FormInput';
import FormButton from '../ui/FormButton';
import FormLink from '../ui/FormLink';
import { useAuth } from '../../hooks/useAuth';
import MessageBox from '../ui/MessageBox';

const LoginForm: React.FC = () => {
    const { login, isLoading: authIsLoading, error: authError, clearError } = useAuth();
    const navigate = useNavigate();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting }, // isSubmitting for RHF-specific loading state
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit: SubmitHandler<LoginFormData> = async (data) => {
        clearError(); // Clear previous API errors
        try {
            await login({ email: data.email, password: data.password });
            navigate('/dashboard');
        } catch (err) {
            if (err instanceof Error) {
                console.error('Login failed:', err.message);
            } else {
                console.error('Login failed with an unknown error:', err);
            }
        }
    };

    return (
        <FormContainer onSubmit={handleSubmit(onSubmit)}>
            {authError && <MessageBox type="error" title="Login Failed">{authError}</MessageBox>}
            
            <FormInput
                id="email"
                // name="email" // RHF handles name via register
                type="email"
                label="Email address"
                placeholder="you@example.com"
                autoComplete="email"
                // value and onChange are handled by RHF
                {...register("email")} // Spread register props
                error={errors.email?.message} // Pass error message
            />

            <div>
                <FormInput
                    id="password"
                    type="password"
                    label="Password"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    {...register("password")}
                    error={errors.password?.message}
                />
                <div className="text-right mt-1">
                    <FormLink to="/forgot-password">
                        Forgot your password?
                    </FormLink>
                </div>
            </div>

            <div>
                <FormButton type="submit" disabled={isSubmitting || authIsLoading}>
                    {isSubmitting || authIsLoading ? 'Signing in...' : 'Sign in'}
                </FormButton>
            </div>
            <div className="text-center">
                <p className="text-sm text-custom-third">
                    Don't have an account?{' '}
                    <FormLink to="/signup">
                        Sign up
                    </FormLink>
                </p>
            </div>
        </FormContainer>
    );
};

export default LoginForm;