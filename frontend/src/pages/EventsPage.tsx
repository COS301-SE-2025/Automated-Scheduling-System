import React, { useState, useEffect, useMemo, useCallback } from 'react'; 
import { PlusCircle, Settings} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import FeatureGrid from '../components/ui/FeatureGrid';
import FeatureBlock from '../components/ui/FeatureBlock';
import * as eventService from '../services/eventService';
import type { CalendarEvent, EventDefinition, CreateEventDefinitionPayload  } from '../services/eventService';
import { Edit, Trash2, AlertCircle, CalendarClock, Link as LinkIcon, Eye } from 'lucide-react';
import { Link } from 'react-router-dom';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import { getAllCompetencies } from '../services/competencyService';
import type { Competency } from '../types/competency';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import Button from '../components/ui/Button';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];

const EventsPage: React.FC = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [eventDefinitions, setEventDefinitions] = useState<EventDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [eventToEdit, setEventToEdit] = useState<CalendarEvent | null>(null);
    const [eventToDelete, setEventToDelete] = useState<CalendarEvent | null>(null);
    const [eventToView, setEventToView] = useState<CalendarEvent | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

    const fetchAndSetData = useCallback(async () => {
        if (!user) return;

        try {
            setIsLoading(true);
            const [fetchedEvents, fetchedDefinitions] = await Promise.all([
                eventService.getScheduledEvents(),
                eventService.getEventDefinitions()
            ]);

            fetchedEvents.sort((a, b) => new Date(a.start as string).getTime() - new Date(b.start as string).getTime());

            setEvents(fetchedEvents);
            setEventDefinitions(fetchedDefinitions ?? []);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch events data:", err);
            setError("Could not load events. Please try again later.");
        } finally {
            setIsLoading(false);
        }

    }, [user]); 

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]);

    // Load competencies for Admin/HR only
    useEffect(() => {
        if (!user) return;
        if (user.role !== 'Admin' && user.role !== 'HR') { setCompetencies([]); return; }
        (async () => {
            try {
                const list = await getAllCompetencies();
                setCompetencies(list.filter(c => c.isActive));
            } catch {
                setCompetencies([]);
            }
        })();
    }, [user]);

    // --- Admin-specific Handlers ---

    const handleAddEventClick = () => {
        setEventToEdit(null);
        setIsFormModalOpen(true);
    };

    const handleOpenDefinitionModal = () => {
        setIsFormModalOpen(false); // Close schedule modal if open
        setIsDefinitionModalOpen(true);
    };

    const handleSaveDefinition = async (definitionData: CreateEventDefinitionPayload) => {
        try {
            await eventService.createEventDefinition(definitionData);
            await fetchAndSetData(); // Refetch everything
            setIsDefinitionModalOpen(false);
        } catch (err) {
            console.error("Failed to save new event definition:", err);
            setError("Could not create the new event type.");
        }
    };
    const handleStartEdit = (event: CalendarEvent) => {
        setEventToEdit(event);
        setIsFormModalOpen(true);
    };

    const handleViewEvent = (event: CalendarEvent) => {
        setEventToView(event);
        setIsDetailModalOpen(true);
    };

    const handleDeleteRequest = (event: CalendarEvent) => {
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const handleDeletionSuccess = () => {
        if (!eventToDelete) return;
        setEvents(prevEvents => prevEvents.filter(e => e.id !== eventToDelete.id));
        setIsDeleteModalOpen(false);
        setEventToDelete(null);
    };

    const handleSaveEvent = async (eventData: EventSaveData) => {
        try {
            const scheduleData: eventService.CreateSchedulePayload = {
                title: eventData.title,
                customEventId: eventData.customEventId,
                start: new Date(eventData.start).toISOString(),
                end: new Date(eventData.end).toISOString(),
                roomName: eventData.roomName,
                maxAttendees: eventData.maximumAttendees ?? undefined,
                minAttendees: eventData.minimumAttendees ?? undefined,
                statusName: eventData.statusName,
                color: eventData.color,
                // Persist linked employees and job positions selected in the modal
                employeeNumbers: (eventData as any).employeeNumbers,
                positionCodes: (eventData as any).positionCodes,
            };

            if (eventData.id) {
                await eventService.updateScheduledEvent(Number(eventData.id), scheduleData);
            } else {
                await eventService.createScheduledEvent(scheduleData);
            }

            await fetchAndSetData();
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

        const toLocalISOString = (date: Date | string) => {
            const d = new Date(date);
            const tzoffset = d.getTimezoneOffset() * 60000;
            const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
            return localISOTime;
        };
        
        return {
            id: eventToEdit.id,
            title: eventToEdit.title,
            startStr: eventToEdit.start ? toLocalISOString(eventToEdit.start as string) : '',
            endStr: eventToEdit.end ? toLocalISOString(eventToEdit.end as string) : '',
            customEventId: eventToEdit.extendedProps.definitionId,
            roomName: eventToEdit.extendedProps.roomName,
            maximumAttendees: eventToEdit.extendedProps.maxAttendees,
            minimumAttendees: eventToEdit.extendedProps.minAttendees,
            statusName: eventToEdit.extendedProps.statusName,
            color: eventToEdit.extendedProps.color,
            // Provide current links so the modal shows selected values while editing
            employeeNumbers: eventToEdit.extendedProps.employees || [],
            positionCodes: eventToEdit.extendedProps.positions || [],
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
            return <AdminView events={events} onEdit={handleStartEdit} onDelete={handleDeleteRequest} onView={handleViewEvent} />;
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
                    <div className="flex space-x-2">
                        <Button type="button" variant="outline" onClick={handleOpenDefinitionModal}>
                            <Settings size={20} className="inline-block mr-2" />
                            Create New Event Types
                        </Button>
                        <Button type="button" variant="primary" onClick={handleAddEventClick}>
                            <PlusCircle size={20} className="inline-block mr-2" />
                            Schedule Event
                        </Button>
                    </div>
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
                        eventDefinitions={eventDefinitions}
                        onNeedDefinition={handleOpenDefinitionModal}
                    />
                    {eventToView && (
                        <EventDetailModal
                            isOpen={isDetailModalOpen}
                            onClose={() => setIsDetailModalOpen(false)}
                            event={eventToView as any}
                            onEdit={(e: any) => { handleStartEdit(e as CalendarEvent); setIsDetailModalOpen(false); }}
                            onDelete={(e: any) => { handleDeleteRequest(e as CalendarEvent); setIsDetailModalOpen(false); }}
                        />
                    )}
                    {isDefinitionModalOpen && (
                        <EventDefinitionFormModal
                            isOpen={isDefinitionModalOpen}
                            onClose={() => setIsDefinitionModalOpen(false)}
                            onSave={handleSaveDefinition}
                            competencies={competencies}
                            showGrantField={user?.role === 'Admin' || user?.role === 'HR'}
                        />
                    )}
                    {eventToDelete && (
                        <EventDeleteConfirmationModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            onDeleteSuccess={handleDeletionSuccess}
                            eventId={Number(eventToDelete.id)}
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
    onView: (event: CalendarEvent) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ events, onEdit, onDelete, onView }) => {
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
                                            Type: {event.extendedProps.eventType || 'General'} | For: {event.relevantParties || 'All'}
                                        </p>
                                    </div>
                                        <div className="flex items-center space-x-2">
                                        <button onClick={() => onView(event)} className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"><Eye size={16} /></button>
                                        <button onClick={() => onEdit(event)} className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary"><Edit size={16} /></button>
                                        <button onClick={() => onDelete(event)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><Trash2 size={16} /></button>
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