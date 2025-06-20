import React from 'react';
import MainLayout from '../layouts/MainLayout';

const DashboardPage: React.FC = () => {
    return (
        <MainLayout pageTitle="Dashboard">
            <div>
                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                    Dashboard Content
                </h2>
                <p className="mt-4 text-gray-600 dark:text-gray-400">
                    Welcome to your dashboard. Here is where your main application content will go.
                </p>
            </div>
        </MainLayout>
    );
};

export default DashboardPage;