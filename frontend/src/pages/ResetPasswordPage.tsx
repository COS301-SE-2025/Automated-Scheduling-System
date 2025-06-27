import React from 'react';
import { useParams } from 'react-router-dom';
import ResetPasswordForm from '../components/forms/ResetPasswordForm';
import AuthLayout from '../layouts/AuthLayout';

const ForgotPasswordPage: React.FC = () => {
    const { resetToken } = useParams<{ resetToken: string }>();

    if (!resetToken) {
        return <div>Invalid or missing reset token.</div>;
    }

    return (
        <AuthLayout
            title="Reset your password."
            helpText="Enter your password. Make sure you remember it this time!"
        >
            <ResetPasswordForm resetToken={resetToken || ''}/>
        </AuthLayout>
    );
};

export default ForgotPasswordPage;