import React from 'react';
import LoginForm from '../components/forms/LoginForm';
import AuthLayout from '../layouts/AuthLayout';

const LoginPage: React.FC = () => {
    return (
        <AuthLayout
            title="Sign in to continue."
            helpText="Enter your credentials to access your account. If you've forgotten your password, use the 'Forgot Password' link. If you do not have an account, use the 'Sign up' link."
        >
            <LoginForm />
        </AuthLayout>
    );
};

export default LoginPage;