import React from 'react';
import HelpIcon from '../components/ui/HelpIcon';
interface AuthLayoutProps {
    children: React.ReactNode;
    title: string;
    helpText: string;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, helpText }) => {
    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center bg-custom-background dark:bg-dark-background py-12 px-4 sm:px-6 lg:px-8">
            <div className="mb-8 text-center">
                <h2 className="text-xl font-semibold text-custom-secondary dark:text-dark-third">
                    DISCON Specialists
                </h2>
                <h1 className="mt-2 text-4xl font-bold tracking-tight text-custom-primary dark:text-dark-primary">
                    Automated Scheduling System
                </h1>
                <p className="mt-2 text-md text-custom-third dark:text-dark-account-text">
                    {title}
                </p>
            </div>

            <div className="w-full max-w-sm">
                {children}
            </div>

            <div className="fixed bottom-6 flex flex-col items-center gap-4">
                <HelpIcon text={helpText} />
            </div>

        </div>
    );
};

export default AuthLayout;