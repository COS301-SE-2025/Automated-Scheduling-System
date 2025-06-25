import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import FeatureGrid from '../components/ui/FeatureGrid';
import FeatureBlock from '../components/ui/FeatureBlock';
import * as eventService from '../services/eventService';
import type { CalendarEvent } from '../services/eventService';
import { PlusCircle, Edit, Trash2, AlertCircle, CalendarClock, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];

const EventsPage: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);

    const fetchAndSetEvents = async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const fetchedEvents = user.role === 'Admin'
                ? await eventService.getEvents()
                : await eventService.getUserEvents();

            fetchedEvents.sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime());

            setEvents(fetchedEvents);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch events:", err);
            setError("Could not load events. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAndSetEvents();
    }, [user]);

    // --- Admin-specific Handlers ---

    const handleAddEventClick = () => {
        setEventToEdit(null);
        setIsFormModalOpen(true);
    };

    const handleStartEdit = (event: CalendarEvent) => {
        setEventToEdit(event);
        setIsFormModalOpen(true);
    };

    const handleDeleteRequest = (event: CalendarEvent) => {
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            try {
                await eventService.deleteEvent(eventToDelete.id);
                setEvents(prevEvents => prevEvents.filter(e => e.id !== eventToDelete.id));
            } catch (err) {
                console.error('Failed to delete event:', err);
                setError('Failed to delete event.');
            } finally {
                setIsDeleteModalOpen(false);
                setEventToDelete(null);
            }
        }
    };

    const handleSaveEvent = async (eventData: EventSaveData) => {
        try {
            if (eventData.id) {
                await eventService.updateEvent(eventData.id, eventData);
            } else {
                await eventService.createEvent(eventData);
            }

            await fetchAndSetEvents();
        } catch (err) {
            console.error('Failed to save event:', err);
            setError('Failed to save event. Please check your input and try again.');
        } finally {
            setIsFormModalOpen(false);
            setEventToEdit(null);
        }
    };

    const prepareInitialModalData = (): EventFormModalProps['initialData'] | undefined => {
        if (!eventToEdit) return undefined;
        return {
            id: eventToEdit.id,
            title: eventToEdit.title,
            startStr: eventToEdit.start ? new Date(eventToEdit.start as string).toISOString() : '',
            endStr: eventToEdit.end ? new Date(eventToEdit.end as string).toISOString() : '',
            allDay: !!eventToEdit.allDay,
            eventType: eventToEdit.eventType,
            relevantParties: eventToEdit.relevantParties,
        };
    };

    const renderContent = () => {
        if (isLoading) {
            return <p>Loading events...</p>;
        }
        if (error) {
            return (
                <div className="flex items-center gap-2 text-red-500 col-span-full">
                    <AlertCircle size={20} />
                    <p className="font-semibold">{error}</p>
                </div>
            );
        }
        if (user?.role === 'Admin') {
            return <AdminView events={events} onEdit={handleStartEdit} onDelete={handleDeleteRequest} />;
        }
        return <UserView events={events} />;
    };

    return (
        <MainLayout pageTitle="Events">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                        {user?.role === 'Admin' ? 'All Company Events' : 'Your Upcoming Events'}
                    </h1>
                    <p className="mt-1 text-custom-text dark:text-dark-secondary">
                        {user?.role === 'Admin' ? 'Manage all scheduled events across the company.' : 'Here is a list of your scheduled events.'}
                    </p>
                </div>
                {user?.role === 'Admin' && (
                    <button
                        onClick={handleAddEventClick}
                        className="flex items-center px-4 py-2 bg-custom-primary text-white rounded-lg shadow hover:bg-custom-primary-hover focus:outline-none focus:ring-2 focus:ring-custom-primary focus:ring-opacity-50 transition ease-in-out duration-150"
                    >
                        <PlusCircle size={20} className="mr-2" />
                        Add Event
                    </button>
                )}
            </div>

            <FeatureGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {renderContent()}
            </FeatureGrid>

            {/* Modals for Admin */}
            {user?.role === 'Admin' && (
                <>
                    <EventFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSave={handleSaveEvent}
                        initialData={prepareInitialModalData()}
                    />
                    {eventToDelete && (
                        <EventDeleteConfirmationModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            onConfirm={handleConfirmDelete}
                            eventName={eventToDelete.title || 'this event'}
                        />
                    )}
                </>
            )}

        </MainLayout>
    );
};

// --- Sub-component for Admin View ---
interface AdminViewProps {
    events: CalendarEvent[];
    onEdit: (event: CalendarEvent) => void;
    onDelete: (event: CalendarEvent) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ events, onEdit, onDelete }) => {
    const groupedEvents = useMemo(() => {
        const groups = events.reduce((acc, event) => {
            const date = new Date(event.start as string).toLocaleDateString(undefined, {
                year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
            });
            if (!acc[date]) {
                acc[date] = [];
            }
            acc[date].push(event);
            return acc;
        }, {} as Record<string, CalendarEvent[]>);

        for (const date in groups) {
            groups[date].sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime());
        }
        return groups;
    }, [events]);

    if (events.length === 0) {
        return <p className="col-span-full text-custom-text dark:text-dark-secondary">No events have been scheduled yet.</p>;
    }

    return (
        <>
            {Object.entries(groupedEvents).map(([date, dateEvents]) => (
                <FeatureBlock key={date} title={date} icon={<CalendarClock size={24} />}>
                    <ul className="space-y-4">
                        {dateEvents.map(event => (
                            <li key={event.id} className="p-3 rounded-lg bg-custom-bg-secondary dark:bg-dark-div-secondary">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-custom-primary dark:text-dark-primary">{event.title}</p>
                                        <p className="text-sm text-custom-text dark:text-dark-secondary">
                                            {new Date(event.start as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                        <p className="text-xs mt-1 text-custom-text dark:text-dark-secondary">
                                            Type: {event.eventType || 'General'} | For: {event.relevantParties || 'All'}
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <button onClick={() => onEdit(event)} className="p-1 hover:text-custom-primary dark:hover:text-dark-primary transition-colors"><Edit size={16} /></button>
                                        <button onClick={() => onDelete(event)} className="p-1 hover:text-red-500 dark:hover:text-red-400 transition-colors"><Trash2 size={16} /></button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </FeatureBlock>
            ))}
        </>
    );
};


// --- Sub-component for Non-Admin User View ---
interface UserViewProps {
    events: CalendarEvent[];
}

const UserView: React.FC<UserViewProps> = ({ events }) => {
    const upcomingEvents = useMemo(() =>
        events
            .filter(event => event.start && new Date(event.start as string) >= new Date())
            .sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime())
        , [events]);

    if (upcomingEvents.length === 0) {
        return <p className="col-span-full text-custom-text dark:text-dark-secondary">You have no upcoming events.</p>;
    }

    return (
        <>
            <FeatureBlock title="Your Schedule" icon={<CalendarClock size={24} />} className="md:col-span-2 lg:col-span-3">
                <ul className="space-y-3">
                    {upcomingEvents.map(event => (
                        <li key={event.id} className="text-sm border-l-4 border-custom-secondary pl-4 py-1">
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
                <div className="mt-4 pt-4 border-t border-custom-bg-secondary dark:border-dark-div-secondary">
                    <Link to="/calendar" className="text-sm font-semibold text-custom-primary dark:text-dark-primary hover:underline flex items-center gap-2">
                        <LinkIcon size={16} />
                        View Full Calendar for More Details
                    </Link>
                </div>
            </FeatureBlock>
        </>
    );
};

export default EventsPage;