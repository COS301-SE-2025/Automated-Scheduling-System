import DashboardLayout from '../layouts/DashboardLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const DashboardPage: React.FC = () => {
    const { user, logout } = useAuth();
    return (
        <DashboardLayout>
            <div>
                <h1 className="text-2xl font-semibold">Welcome to your Dashboard, {user?.name || 'User'}!</h1>
                <p>This is a protected area.</p>
                <button 
                    onClick={logout} 
                    className="mt-4 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
                >
                    Logout
                </button>
            </div>
        </DashboardLayout>
    );
};

export default DashboardPage;