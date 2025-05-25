import RulesLayout from '../layouts/RulesLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const RulesPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <RulesLayout>
            <div>
                <h1 className="text-2xl font-semibold">Rules - {user?.name || 'User'}</h1>
                <p>Business rules and configurations will be displayed here.</p>
                {/* Rules functionality will be implemented here */}
            </div>
        </RulesLayout>
    );
};

export default RulesPage;