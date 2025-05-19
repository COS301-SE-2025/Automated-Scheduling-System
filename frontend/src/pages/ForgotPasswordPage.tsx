import React from 'react';
import ForgotPasswordForm from '../components/forms/ForgotPasswordForm';
import AuthLayout from '../layouts/AuthLayout';

const ForgotPasswordPage: React.FC = () => {
  return (
    <AuthLayout title="Reset your password.">
      <ForgotPasswordForm />
    </AuthLayout>
  );
};

export default ForgotPasswordPage;