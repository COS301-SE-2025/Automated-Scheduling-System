import React from 'react';
import LoginForm from '../components/forms/LoginForm';
import AuthLayout from '../layouts/AuthLayout';

const LoginPage: React.FC = () => {
  return (
    <AuthLayout title="Sign in to continue to your account.">
      <LoginForm />
    </AuthLayout>
  );
};

export default LoginPage;