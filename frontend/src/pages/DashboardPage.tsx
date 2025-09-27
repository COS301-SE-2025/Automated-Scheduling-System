import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import FeatureGrid from '../components/ui/FeatureGrid';
import FeatureBlock from '../components/ui/FeatureBlock';
import { getScheduledEvents, type CalendarEvent } from '../services/eventService';
import { getEmployeeVisualizationData, type VisualizationData } from '../services/visualizationService';
import VisualizationTab from '../components/visualization/VisualizationTab';
import { CalendarClock, Users, Calendar, HelpCircle, AlertCircle, Shield, FileText, Gavel, GraduationCap, TrendingUp } from 'lucide-react';

const DashboardPage: React.FC = () => {
    const { user, permissions } = useAuth();
    const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([]);
    const [vizData, setVizData] = useState<VisualizationData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [vizLoading, setVizLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [vizError, setVizError] = useState<string | null>(null);

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

    useEffect(() => {
        const fetchVisualizationData = async () => {
            if (!user) return;

            try {
                setVizLoading(true);
                const res = await getEmployeeVisualizationData();
                setVizData(res);
                setVizError(null);
            } catch (e) {
                console.error('Failed to load visualization data:', e);
                setVizError('Failed to load visualization data');
            } finally {
                setVizLoading(false);
            }
        };

        fetchVisualizationData();
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
                    <li key={event.id} className="text-sm border-l-4 border-custom-secondary dark:border-dark-accent pl-3">
                        <p className="font-bold text-custom-text dark:text-dark-text">{event.title}</p>
                        <p className="text-custom-text dark:text-dark-text">
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
                    Here's a quick overview of your workspace and competency status.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Upcoming Events Card */}
                <Link to="/events" className='block'>
                    <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 h-full hover:border-custom-secondary dark:hover:border-dark-secondary">
                        <div className="flex items-center gap-3 mb-4">
                            <CalendarClock size={24} className="text-custom-primary dark:text-dark-primary" />
                            <h2 className="text-xl font-semibold text-custom-text dark:text-dark-text">Upcoming Events</h2>
                        </div>
                        <UpcomingEventsContent />
                    </div>
                </Link>

                {/* Quick Actions for Admin */}
                {user?.role === 'Admin' && (
                    <Link to="/admin/compliance" className="block">
                        <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 h-full hover:border-custom-secondary dark:hover:border-dark-secondary">
                            <div className="flex items-center gap-3 mb-4">
                                <TrendingUp size={24} className="text-custom-primary dark:text-dark-primary" />
                                <h2 className="text-xl font-semibold text-custom-text dark:text-dark-text">Compliance Dashboard</h2>
                            </div>
                            <p className="text-custom-text dark:text-dark-secondary">Monitor company-wide competency compliance and identify areas needing attention.</p>
                        </div>
                    </Link>
                )}

                {/* Calendar Quick Access */}
                <Link to="/calendar" className="block">
                    <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-all duration-200 h-full hover:border-custom-secondary dark:hover:border-dark-secondary">
                        <div className="flex items-center gap-3 mb-4">
                            <Calendar size={24} className="text-custom-primary dark:text-dark-primary" />
                            <h2 className="text-xl font-semibold text-custom-text dark:text-dark-text">Full Calendar</h2>
                        </div>
                        <p className="text-custom-text dark:text-dark-secondary">View the complete company calendar and manage your schedule.</p>
                    </div>
                </Link>
            </div>

            {/* Competency Visualization Section */}
            <div className="bg-white dark:bg-dark-div p-6 rounded-lg shadow border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-6">
                    <GraduationCap size={24} className="text-custom-primary dark:text-dark-primary" />
                    <h2 className="text-2xl font-semibold text-custom-text dark:text-dark-text">Your Competency Overview</h2>
                </div>
                <VisualizationTab 
                    data={vizData}
                    loading={vizLoading}
                    error={vizError}
                />
            </div>

            {/* Quick Links Grid */}
            <div className="mt-8">
                <h3 className="text-xl font-semibold text-custom-text dark:text-dark-text mb-6">Quick Actions</h3>
                <FeatureGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {user?.role === 'Admin' && (
                        <Link to="/users" className="block">
                            <FeatureBlock title="Manage Users" icon={<Users size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                                <p>Add, edit, or remove users and manage their roles and permissions.</p>
                            </FeatureBlock>
                        </Link>
                    )}

                    {permissions?.includes('roles') && (
                        <Link to="/roles" className="block">
                            <FeatureBlock title="Roles & Permissions" icon={<Shield size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                                <p>Create and edit roles, and control page access via permissions.</p>
                            </FeatureBlock>
                        </Link>
                    )}

                    {permissions?.includes('event-definitions') && (
                        <Link to="/event-definitions" className="block">
                            <FeatureBlock title="Event Definitions" icon={<FileText size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                                <p>Define reusable event templates, facilitators, and durations.</p>
                            </FeatureBlock>
                        </Link>
                    )}

                    {permissions?.includes('rules') && (
                        <Link to="/rules" className="block">
                            <FeatureBlock title="Rules" icon={<Gavel size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                                <p>Design business rules by combining triggers, conditions, and actions.</p>
                            </FeatureBlock>
                        </Link>
                    )}

                    {permissions?.includes('competencies') && (
                        <Link to="/competencies" className="block">
                            <FeatureBlock title="Competencies" icon={<GraduationCap size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                                <p>Manage competencies, types, prerequisites, and job requirements.</p>
                            </FeatureBlock>
                        </Link>
                    )}

                    <Link to="/main-help" className="block">
                        <FeatureBlock title="Help & Feedback" icon={<HelpCircle size={24} />} minSubtext className="dark:from-dark-accent-hover dark:to-dark-accent">
                            <p>Find answers to common questions or get support assistance.</p>
                        </FeatureBlock>
                    </Link>
                </FeatureGrid>
            </div>
        </MainLayout>
    );
};

export default DashboardPage;