import React from 'react';
import ForgotPasswordForm from '../components/forms/ForgotPasswordForm';
import AuthLayout from '../layouts/AuthLayout';

const ForgotPasswordPage: React.FC = () => {
    return (
        <AuthLayout
            title="Reset your password."
            helpText="Enter your email to reset your password. If you remember your password, use the 'Back to login' link."
            helpPlacement="above"
            helpAlign="center"
        >
            <ForgotPasswordForm />
        </AuthLayout>
    );
};

export default ForgotPasswordPage;