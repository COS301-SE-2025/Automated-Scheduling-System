import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PlusCircle, Settings } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import FeatureGrid from '../components/ui/FeatureGrid';
import FeatureBlock from '../components/ui/FeatureBlock';
import * as eventService from '../services/eventService';
import type { CalendarEvent, EventDefinition, CreateEventDefinitionPayload } from '../services/eventService';
import { Edit, Trash2, AlertCircle, CalendarClock, Eye } from 'lucide-react';
import { ApiError } from '../services/api';
// import { Link } from 'react-router-dom';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import { getAllCompetencies } from '../services/competencyService';
import type { Competency } from '../types/competency';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import Button from '../components/ui/Button';
import GenericSelectModal from '../components/ui/GenericSelectModal';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type RSVPChoice = 'book' | 'reject';

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

    // Track RSVP loading per-event at the page level
    const [rsvpLoading, setRsvpLoading] = useState<Record<string, RSVPChoice | null>>({});

    // Attendance selection after completion
    const [attendancePickerOpen, setAttendancePickerOpen] = useState(false);
    const [attendanceItems, setAttendanceItems] = useState<{ employeeNumber: string; name: string }[]>([]);
    const [attendanceInitialSelected, setAttendanceInitialSelected] = useState<string[]>([]);
    const [attendanceScheduleId, setAttendanceScheduleId] = useState<number | null>(null);

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

    // Load competencies for Admin/HR only (normal users don’t need these for event type creation)
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
            const isElevated = user?.role === 'Admin' || user?.role === 'HR';

            const employeeNumbers = isElevated ? (eventData as any).employeeNumbers : undefined;
            const positionCodes = isElevated ? (eventData as any).positionCodes : undefined;

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
                employeeNumbers,
                positionCodes,
            };

            const wasCompleted = !!eventToEdit && String(eventToEdit.extendedProps.statusName || '').toLowerCase() === 'completed';
            const becomesCompleted = String(scheduleData.statusName || '').toLowerCase() === 'completed';
            const scheduleId = eventData.id ? Number(eventData.id) : undefined;

            if (eventData.id) {
                await eventService.updateScheduledEvent(Number(eventData.id), scheduleData);
            } else {
                await eventService.createScheduledEvent(scheduleData);
            }

            // If we just transitioned to Completed, and user can manage attendance, open picker for booked employees
            if (isElevated && scheduleId && !wasCompleted && becomesCompleted) {
                try {
                    const booked = await eventService.getBookedEmployees(scheduleId);
                    const list = Array.isArray(booked) ? booked : [];
                    if (list.length > 0) {
                        setAttendanceItems(list);
                        setAttendanceInitialSelected(list.map(b => b.employeeNumber)); // default all booked as selected
                        setAttendanceScheduleId(scheduleId);
                        setAttendancePickerOpen(true);
                    } // If none booked, skip modal
                } catch (e) {
                    console.error('Failed to load booked employees for attendance:', e);
                }
            }

            await fetchAndSetData();
        } catch (err) {
            console.error('Failed to save event:', err);
            if (err instanceof ApiError && err.status === 403) {
                setError('You are not permitted to modify this event. Only the creator or Admin/HR can edit it.');
            } else {
                setError('Failed to save event. Please check your input and try again.');
            }
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

    const handleRSVP = async (eventId: number, choice: RSVPChoice) => {
        const key = String(eventId);
        setRsvpLoading(prev => ({ ...prev, [key]: choice }));
        try {
            await eventService.rsvpScheduledEvent(eventId, choice);
            await fetchAndSetData();
        } catch (e) {
            console.error('RSVP failed', e);
            alert('Failed to update RSVP');
        } finally {
            setRsvpLoading(prev => ({ ...prev, [key]: null }));
        }
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
        // Pass RSVP controls/loading down; edit/delete gated by canEdit/canDelete
        return (
            <AdminView
                events={events}
                onEdit={handleStartEdit}
                onDelete={handleDeleteRequest}
                onView={handleViewEvent}
                onRSVP={handleRSVP}
                rsvpLoading={rsvpLoading}
            // currentEmployeeNumber={currentEmployeeNumber} // ADD
            />
        );
    };

    return (
        <MainLayout pageTitle="Events">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-custom-primary dark:text-dark-primary">
                        {user?.role === 'Admin' ? 'All Company Events' : 'All Events'}
                    </h1>
                    <p className="mt-1 text-custom-text dark:text-dark-secondary">
                        {user?.role === 'Admin' ? 'Manage all scheduled events across the company.' : 'View, schedule, and manage events you have access to.'}
                    </p>
                </div>
                {/* Show actions to all users; backend/flags enforce permissions on save/update */}
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
            </div>

            <FeatureGrid className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                {renderContent()}
            </FeatureGrid>

            {/* Modals for all users (grant field hidden for non-Admin/HR) */}
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
                    onAfterRSVP={() => { setIsDetailModalOpen(false); fetchAndSetData(); }}
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
            {/* Attendance picker after completion */}
            <GenericSelectModal<{ employeeNumber: string; name: string }>
                isOpen={attendancePickerOpen}
                title="Mark attendance"
                items={attendanceItems}
                idKey={(x) => x.employeeNumber}
                columns={[
                    { header: 'Employee', render: (x) => x.name },
                    { header: 'Number', render: (x) => x.employeeNumber, className: 'text-gray-500' }
                ]}
                searchFields={['name', 'employeeNumber'] as any}
                initialSelected={attendanceInitialSelected}
                onClose={() => { setAttendancePickerOpen(false); setAttendanceItems([]); setAttendanceScheduleId(null); }}
                footerPrimaryLabel="Save attendance"
                onConfirm={async (selectedIds) => {
                    try {
                        const scheduleId = attendanceScheduleId!;
                        // Build candidate list = all booked; attendance true only for selected
                        const employeeNumbers = attendanceItems.map(i => i.employeeNumber);
                        const attendanceMap: Record<string, boolean> = {};
                        employeeNumbers.forEach(e => { attendanceMap[e] = selectedIds.includes(e); });
                        await eventService.setAttendance(scheduleId, { employeeNumbers, attendance: attendanceMap });
                        await fetchAndSetData();
                    } catch {
                        alert('Failed to save attendance');
                    } finally {
                        setAttendancePickerOpen(false);
                        setAttendanceItems([]);
                        setAttendanceScheduleId(null);
                    }
                }}
            />
        </MainLayout>
    );
};

// --- Sub-component for Admin View ---
interface AdminViewProps {
    events: CalendarEvent[];
    onEdit: (event: CalendarEvent) => void;
    onDelete: (event: CalendarEvent) => void;
    onView: (event: CalendarEvent) => void;
    onRSVP: (eventId: number, choice: RSVPChoice) => void;
    rsvpLoading: Record<string, RSVPChoice | null>;
}

const AdminView: React.FC<AdminViewProps> = ({ events, onEdit, onDelete, onView, onRSVP, rsvpLoading }) => {
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
                <FeatureBlock key={date} title={date} icon={<CalendarClock size={24} />} className="dark:from-dark-accent-hover dark:to-dark-accent">
                    <ul className="space-y-4">
                        {dateEvents.map(event => {
                            const myBooking = event.extendedProps.myBooking;
                            const spotsLeft = event.extendedProps.spotsLeft;
                            const maxAtt = event.extendedProps.maxAttendees;
                            const bookedCount = event.extendedProps.bookedCount;
                            const isCompleted = String(event.extendedProps.statusName || '').toLowerCase() === 'completed';

                            // Use backend-provided eligibility; also hide on completed
                            const canShowRSVP = event.extendedProps.canRSVP === true && !isCompleted;

                            const canBookNow = () => {
                                if (myBooking === 'Booked') return true;
                                if (typeof spotsLeft === 'number') return spotsLeft > 0;
                                return true;
                            };
                            const loading = rsvpLoading[event.id] ?? null;

                            return (
                                <li key={event.id} className="p-3 rounded-lg bg-custom-bg-secondary dark:bg-dark-div-secondary">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-custom-text dark:text-dark-text">{event.title}</p>
                                            <p className="text-sm text-custom-text dark:text-dark-text">
                                                {new Date(event.start as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                            <p className="text-xs mt-1 text-custom-text dark:text-dark-text/80">
                                                Type: {event.extendedProps.eventType || 'General'} | For: {event.extendedProps.relevantParties || 'All'}
                                            </p>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {/* RSVP controls and capacity */}
                                            {canShowRSVP && (
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => onRSVP(Number(event.extendedProps.scheduleId), 'book')}
                                                            disabled={!canBookNow() || loading === 'reject'}
                                                            className={`px-2 py-1 rounded text-xs ${myBooking === 'Booked' ? 'bg-custom-primary text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                            title="Book"
                                                        >
                                                            {loading === 'book' ? '...' : (myBooking === 'Booked' ? 'Booked' : 'Book')}
                                                        </button>
                                                        <button
                                                            onClick={() => onRSVP(Number(event.extendedProps.scheduleId), 'reject')}
                                                            disabled={loading === 'book'}
                                                            className={`px-2 py-1 rounded text-xs ${myBooking === 'Rejected' ? 'bg-red-600 text-white' : 'border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                                                            title="Reject"
                                                        >
                                                            {loading === 'reject' ? '...' : (myBooking === 'Rejected' ? 'Rejected' : 'Reject')}
                                                        </button>
                                                    </div>
                                                    {typeof maxAtt === 'number' && (
                                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                            {bookedCount ?? 0}/{maxAtt}{typeof spotsLeft === 'number' ? ` • ${spotsLeft} left` : ''}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {/* Completed: show attendance state (no RSVP) */}
                                            {isCompleted && (
                                                <div className="flex items-center gap-2">
                                                    {typeof maxAtt === 'number' && (
                                                        <span className="text-[11px] text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">
                                                            Attended: {bookedCount ?? 0}
                                                        </span>
                                                    )}
                                                    {myBooking && (
                                                        <span className={`text-[11px] px-2 py-1 rounded ${myBooking === 'Attended' ? 'bg-green-600 text-white' : 'bg-gray-400 text-white'}`}>
                                                            You: {myBooking}
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {/* View/Edit/Delete */}
                                            <button onClick={() => onView(event)} className="text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"><Eye size={16} /></button>
                                            {event.extendedProps.canEdit === true && (
                                                <button onClick={() => onEdit(event)} className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary"><Edit size={16} /></button>
                                            )}
                                            {event.extendedProps.canDelete === true && (
                                                <button onClick={() => onDelete(event)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </FeatureBlock>
            ))}
        </>
    );
};

export default EventsPage;