import MainLayout from '../layouts/MainLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const RulesPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <MainLayout pageTitle='Rules'>
            <div>
                <h1 className="text-2xl font-semibold">Rules - {user?.name || 'User'}</h1>
                <p>Business rules and configurations will be displayed here.</p>
                {/* Rules functionality will be implemented here */}
            </div>
        </MainLayout>
    );
};

export default RulesPage;