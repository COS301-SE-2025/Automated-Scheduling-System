import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import FeatureGrid from '../components/ui/FeatureGrid';
import FeatureBlock from '../components/ui/FeatureBlock';
import { getScheduledEvents, type CalendarEvent } from '../services/eventService';
import { CalendarClock, Users, Calendar, HelpCircle, AlertCircle, Shield, FileText, Gavel, GraduationCap } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const { user } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUpcomingEvents = async () => {
            if (!user) return;

            try {
                setIsLoading(true);
                const userEvents = await getScheduledEvents();

                const upcoming = userEvents
                    .filter(event => event.start && new Date(event.start as string) > new Date())
                    .sort((a, b) => new Date(a.start! as string).getTime() - new Date(b.start! as string).getTime())
                    .slice(0, 3);

                setUpcomingEvents(upcoming);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch scheduled events:", err);
                setError("Could not load your upcoming events.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchUpcomingEvents();
    }, [user]);

    const UpcomingEventsContent = () => {
        if (isLoading) {
            return <p className="text-sm text-custom-text dark:text-dark-secondary">Loading your events...</p>;
        }
        if (error) {
            return (
                <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle size={20} />
                    <p className="text-sm font-semibold">{error}</p>
                </div>
            );
        }
        if (upcomingEvents.length === 0) {
            return <p className="text-sm text-custom-text dark:text-dark-secondary">No upcoming events on your schedule.</p>;
        }
        return (
            <ul className="space-y-3">
                {upcomingEvents.map(event => (
                    <li key={event.id} className="text-sm border-l-4 border-custom-secondary pl-3">
                        <p className="font-bold text-custom-primary dark:text-dark-primary">{event.title}</p>
                        <p className="text-custom-text dark:text-dark-secondary">
                            {new Date(event.start! as string).toLocaleDateString(undefined, {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',

                                hour: 'numeric',
                                minute: '2-digit'
                            })}
                        </p>
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <MainLayout pageTitle="Dashboard">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                    Welcome, {user?.name || 'User'}!
                </h1>
                <p className="mt-1 text-custom-text dark:text-dark-secondary">
                    Here's a quick overview of your workspace.
                </p>
            </div>

            <FeatureGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-2">

                <Link to="/events" className='block'>
                    <FeatureBlock title="Your Upcoming Events" icon={<CalendarClock size={24} />}>                    
                        <UpcomingEventsContent />
                    </FeatureBlock>
                </Link>

                {user?.role === 'Admin' && (
                    <Link to="/users" className="block">
                        <FeatureBlock title="Manage Users" icon={<Users size={24} />} minSubtext>
                            <p>Add, edit, or remove users and manage their roles and permissions across the system.</p>
                        </FeatureBlock>
                    </Link>
                )}

                <Link to="/calendar" className="block">
                    <FeatureBlock title="View Full Calendar" icon={<Calendar size={24} />} minSubtext>
                        <p>Access the interactive company calendar to view all events, schedule new meetings, and manage deadlines.</p>
                    </FeatureBlock>
                </Link>

                {/* Additional links in sidebar order after keeping Events, Users, Calendar in place */}
                <Link to="/roles" className="block">
                    <FeatureBlock title="Roles & Permissions" icon={<Shield size={24} />} minSubtext>
                        <p>Create and edit roles, and control page access via permissions.</p>
                    </FeatureBlock>
                </Link>

                <Link to="/event-definitions" className="block">
                    <FeatureBlock title="Event Definitions" icon={<FileText size={24} />} minSubtext>
                        <p>Define reusable event templates, facilitators, and durations used for scheduling.</p>
                    </FeatureBlock>
                </Link>

                <Link to="/rules" className="block">
                    <FeatureBlock title="Rules" icon={<Gavel size={24} />} minSubtext>
                        <p>Design business rules by combining triggers, conditions, and actions.</p>
                    </FeatureBlock>
                </Link>

                <Link to="/competencies" className="block">
                    <FeatureBlock title="Competencies" icon={<GraduationCap size={24} />} minSubtext>
                        <p>Manage competencies, types, prerequisites, and job position requirements.</p>
                    </FeatureBlock>
                </Link>

                <Link to="/main-help" className="block">
                    <FeatureBlock title="Help & Feedback" icon={<HelpCircle size={24} />} minSubtext>
                        <p>Find answers to common questions, read documentation, or get in touch with support for assistance.</p>
                    </FeatureBlock>
                </Link>

            </FeatureGrid>
        </MainLayout>
    );
};

export default DashboardPage;