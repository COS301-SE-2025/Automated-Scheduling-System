import DashboardLayout from '../layouts/DashboardLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
    const { user } = useAuth(); // `logout` function is no longer called directly from here
    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold">Welcome to your Dashboard, {user?.name || 'User'}!</h1>
                <p>This is a protected area.</p>
                {/* The logout button is now part of the Header component in DashboardLayout */}
            </div>
        </DashboardLayout>
    );
};

export default DashboardPage;