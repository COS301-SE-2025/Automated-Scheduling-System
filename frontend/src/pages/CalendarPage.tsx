import CalendarLayout from '../layouts/CalendarLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <CalendarLayout>
            <div>
                <h1 className="text-2xl font-semibold">Calendar - {user?.name || 'User'}</h1>
                <p>Your calendar and scheduling system will be displayed here.</p>
                {/* Calendar functionality will be implemented here */}
            </div>
        </CalendarLayout>
    );
};

export default CalendarPage;