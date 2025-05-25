import EventsLayout from '../layouts/EventLayout';
import React from 'react';
import { useAuth } from '../hooks/useAuth';

const EventsPage: React.FC = () => {
    const { user } = useAuth();
    return (
        <EventsLayout>
            <div>
                <h1 className="text-2xl font-semibold">Events - {user?.name || 'User'}</h1>
                <p>Event management and tracking will be displayed here.</p>
                {/* Events functionality will be implemented here */}
            </div>
        </EventsLayout>
    );
};

export default EventsPage;