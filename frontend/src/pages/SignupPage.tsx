import React from 'react';
import SignupForm from '../components/forms/SignupForm';
import AuthLayout from '../layouts/AuthLayout';

const SignupPage: React.FC = () => {
  return (
    <AuthLayout title="Get started by creating a new account.">
      <SignupForm />
    </AuthLayout>
  );
};

export default SignupPage;