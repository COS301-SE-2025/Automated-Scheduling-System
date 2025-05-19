import React from 'react';
import LoginForm from '../components/forms/LoginForm';

const LoginPage: React.FC = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-custom-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
                {/* logo? */}
                <h2 className="text-xl font-semibold text-custom-secondary">
                    DISCON Specialists
                </h2>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-custom-primary">
                    Automated Scheduling System
                </h1>
                <p className="mt-2 text-md text-custom-third">
                    Sign in to continue to your account.
                </p>
            </div>
            <LoginForm />
        </div>
    );
};

export default LoginPage;