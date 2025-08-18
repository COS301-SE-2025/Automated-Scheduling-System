import React from 'react';
import SignupForm from '../components/forms/SignupForm';
import AuthLayout from '../layouts/AuthLayout';

const SignupPage: React.FC = () => {
    return (
        <AuthLayout
            title="Get started by creating a new account."
            helpText="Enter your credentials to create an account account. If you already have an account, use the 'Sign in' link."
            helpPlacement="above"
            helpAlign="center"
        >
            <SignupForm />
        </AuthLayout>
    );
};

export default SignupPage;