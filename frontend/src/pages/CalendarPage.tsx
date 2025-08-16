import MainLayout from '../layouts/MainLayout';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlusCircle, Settings } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, DateSelectArg, EventClickArg, EventDropArg} from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import * as eventService from '../services/eventService';
import type { CalendarEvent, CreateEventDefinitionPayload } from '../services/eventService';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type SelectedInfoType = DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });

const CalendarPage: React.FC = () => {
    const { permissions } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDefinitionModalOpen, setIsDefinitionModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clickedEventInfo, setClickedEventInfo] = useState<EventClickArg['event'] | null>(null);
    const [selectedDateInfo, setSelectedDateInfo] = useState<SelectedInfoType | null>(null);
    const [eventToEdit, setEventToEdit] = useState<EventClickArg['event'] | null>(null);
    const [eventToDelete, setEventToDelete] = useState<EventClickArg['event'] | null>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [eventDefinitions, setEventDefinitions] = useState<eventService.EventDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setIsLoading(true);
                const [schedules, definitions] = await Promise.all([
                    eventService.getScheduledEvents(),
                    permissions?.includes('event-definitions') ? eventService.getEventDefinitions() : Promise.resolve([])
                ]);
                setEvents(schedules);
                setEventDefinitions(definitions);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch calendar data:", err);
                setError("Could not load calendar data.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchInitialData();
    }, [permissions]);

    const handleAddEventClick = () => {
        setSelectedDateInfo(null);
        setEventToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenDefinitionModal = () => {
        setIsModalOpen(false); // Close schedule modal if open
        setIsDefinitionModalOpen(true);
    };

    const fetchAndSetData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [schedules, definitions] = await Promise.all([
                eventService.getScheduledEvents(),
                permissions?.includes('event-definitions') ? eventService.getEventDefinitions() : Promise.resolve([])
            ]);

            const processedSchedules = schedules.map(event => {
                if (!event.start || !event.end) return event;

                const startDate = new Date(event.start as string);
                const endDate = new Date(event.end as string);

                // Check if the event spans across midnight into another day
                if (startDate.toDateString() !== endDate.toDateString()) {
                    // Make it appear as a 2-hour event on the start day for rendering
                    const displayEndDate = new Date(startDate);
                    displayEndDate.setHours(startDate.getHours() + 2);

                    return {
                        ...event,
                        end: displayEndDate.toISOString(), // Visually shorten the event
                        extendedProps: {
                            ...event.extendedProps,
                            isMultiDay: true, // Add a flag
                            originalEnd: event.end, // Store the real end date
                        }
                    };
                }
                return event;
            });

            setEvents(processedSchedules);
            setEventDefinitions(definitions);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch calendar data:", err);
            setError("Could not load calendar data.");
        } finally {
            setIsLoading(false);
        }
    }, [permissions]);

    useEffect(() => {
        fetchAndSetData();
    }, [fetchAndSetData]); 

    const handleSaveDefinition = async (definitionData: CreateEventDefinitionPayload) => {
        try {
            await eventService.createEventDefinition(definitionData);
            await fetchAndSetData(); 
            setIsDefinitionModalOpen(false);
        } catch (err) {
            console.error("Failed to save new event definition:", err);
            setError("Could not create the new event type.");
        }
    };

    const handleDateClick = (clickInfo: DateClickArg) => {
        setSelectedDateInfo(clickInfo);
        setIsModalOpen(true);
    };

    const handleSelect = (selectInfo: DateSelectArg) => {
        setSelectedDateInfo(selectInfo);
        setIsModalOpen(true);
    };

    const handleEventClick = (clickInfo: EventClickArg) => {
        setClickedEventInfo(clickInfo.event);
        setIsDetailModalOpen(true);
    };

    const handleStartEdit = (event: EventClickArg['event']) => {
        setIsDetailModalOpen(false);
        setEventToEdit(event);
        setIsModalOpen(true);
    };

    const handleDeleteRequest = (event: EventClickArg['event']) => {
        setIsDetailModalOpen(false);
        setEventToDelete(event);
        setIsDeleteModalOpen(true);
    };

    const handleDeletionSuccess = () => {
        if (!eventToDelete) return;
        const calendarApi = calendarRef.current?.getApi();
        calendarApi?.getEventById(eventToDelete.id)?.remove();
        
        setIsDeleteModalOpen(false);
        setEventToDelete(null);
    };

    const handleEventDrop = async (dropInfo: EventDropArg) => {
        const { event } = dropInfo;
        if (!event.id || !event.start) {
            console.error("Event drop failed: missing event ID or start date.");
            dropInfo.revert(); 
            return;
        }

        try {
            const scheduleData: eventService.CreateSchedulePayload = {
                title: event.title,
                customEventId: event.extendedProps.definitionId,
                roomName: event.extendedProps.roomName,
                maxAttendees: event.extendedProps.maxAttendees,
                minAttendees: event.extendedProps.minAttendees,
                statusName: event.extendedProps.statusName,
                color: event.extendedProps.color,
                start: event.start.toISOString(),
                end: event.end ? event.end.toISOString() : event.start.toISOString(),
            };

            await eventService.updateScheduledEvent(Number(event.id), scheduleData);
            
            // Optional: refetch all data to ensure consistency, though FullCalendar updates the UI optimistically.
            await fetchAndSetData();

        } catch (err) {
            console.error('Failed to update event after drop:', err);
            // If the API call fails, revert the event to its original position
            dropInfo.revert(); 
        }
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
            };

            if (eventData.id) {
                await eventService.updateScheduledEvent(Number(eventData.id), scheduleData);
            } else {
                await eventService.createScheduledEvent(scheduleData);
            }
            
            await fetchAndSetData();
            
        } catch (err) {
            console.error('Failed to save event:', err);
        } finally {
            setIsModalOpen(false);
            setSelectedDateInfo(null);
            setEventToEdit(null);
        }
    };

    const prepareInitialModalData = (): EventFormModalProps['initialData'] | undefined => {
        const toLocalISOString = (date: Date | string) => {
            const d = typeof date === 'string' ? new Date(date) : date;
            const tzoffset = d.getTimezoneOffset() * 60000;
            const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
            return localISOTime;
        };

        if (eventToEdit) {
            // Use the original end date for multi-day events when editing
            const endDate = eventToEdit.extendedProps.originalEnd || eventToEdit.end;
            return {
                id: eventToEdit.id,
                title: eventToEdit.title,
                startStr: eventToEdit.start ? toLocalISOString(eventToEdit.start) : '',
                endStr: endDate ? toLocalISOString(endDate as string) : '',
                customEventId: eventToEdit.extendedProps.definitionId,
                roomName: eventToEdit.extendedProps.roomName,
                maximumAttendees: eventToEdit.extendedProps.maxAttendees,
                minimumAttendees: eventToEdit.extendedProps.minAttendees,
                statusName: eventToEdit.extendedProps.statusName,
                color: eventToEdit.extendedProps.color,
            };
        }
        
        if (!selectedDateInfo) return undefined;

        if ('date' in selectedDateInfo && !('startStr' in selectedDateInfo)) {
            const dateClick = selectedDateInfo as DateClickArg;
            return {
                startStr: toLocalISOString(dateClick.date),
                endStr: toLocalISOString(new Date(dateClick.date.getTime() + 60 * 60 * 1000)), // Default to 1 hour
            };
        }

        if ('start' in selectedDateInfo) {
            const selectableInfo = selectedDateInfo as DateSelectArg;
            return {
                startStr: toLocalISOString(selectableInfo.start),
                endStr: toLocalISOString(selectableInfo.end),
            };
        }
        return undefined;
    };


    return (
        <MainLayout pageTitle='Calendar'>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold text-custom-text dark:text-dark-text">Calendar</h1>
                    <div className="flex space-x-2">
                        <Button type="button" variant="outline" onClick={handleOpenDefinitionModal}>
                            <Settings size={20} className="inline-block mr-2" />
                            Manage Event Types
                        </Button>
                        <Button type="button" variant="primary" onClick={handleAddEventClick}>
                            <PlusCircle size={20} className="inline-block mr-2" />
                            Schedule Event
                        </Button>
                    </div>
                </div>

                {isLoading && (
                    <div className="text-center p-10 text-custom-text dark:text-dark-text">
                        <p>Loading your calendar...</p>
                    </div>
                )}

                {error && (
                    <div className="text-center p-10 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                        <p className="font-semibold">Failed to load calendar</p>
                        <p className="text-sm">{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <div className="bg-white dark:bg-dark-div p-4 rounded-lg shadow calendar-container">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            height="100%"            
                            expandRows={true}        
                            handleWindowResize={true}
                            scrollTime="00:00:00"    
                            editable={true}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            events={events}
                            eventContent={renderEventContent}
                            ref={calendarRef}
                            eventClick={handleEventClick}
                            dateClick={handleDateClick}
                            select={handleSelect}
                            eventDrop={handleEventDrop} 
                        />
                    </div>
                )}
                
            </div>

            <EventFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDateInfo(null);
                    setEventToEdit(null);
                    const calendarApi = calendarRef.current?.getApi();
                    calendarApi?.unselect();
                }}
                onSave={handleSaveEvent}
                initialData={prepareInitialModalData()}
                eventDefinitions={eventDefinitions}
                onNeedDefinition={handleOpenDefinitionModal}
            />
            {isDefinitionModalOpen && (
                <EventDefinitionFormModal
                    isOpen={isDefinitionModalOpen}
                    onClose={() => setIsDefinitionModalOpen(false)}
                    onSave={handleSaveDefinition}
                />
            )}
            <EventDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => setIsDetailModalOpen(false)}
                event={clickedEventInfo}
                onEdit={handleStartEdit}
                onDelete={handleDeleteRequest}
            />
            {eventToDelete && (
                <EventDeleteConfirmationModal
                    isOpen={isDeleteModalOpen}
                    onClose={() => {
                        setIsDeleteModalOpen(false);
                        setEventToDelete(null);
                    }}
                    onDeleteSuccess={handleDeletionSuccess}
                    eventId={Number(eventToDelete.id)}
                    eventName={eventToDelete.title}
                />
            )}
        </MainLayout>
    );
};

export default CalendarPage;

function renderEventContent(eventInfo: EventContentArg) {
    const { extendedProps, title } = eventInfo.event;
    
    const eventStyle = {
        backgroundColor: extendedProps.color || '#3788d8',
        color: '#ffffff',
        padding: '2px 4px',
        borderRadius: '3px',
        borderColor: '#6b6f72ff',
        display: 'flex',
        gap: '4px',
        height: '100%',
    };

    return (
        <div
            style={eventStyle}
            className="custom-calendar-event"
            title={`${title} (${extendedProps.eventType})`}
        >

            {/* Always show the event title */}
            <span className="custom-event-title flex-grow">{title}</span>
            
            {/* Show event type if available */}
            {extendedProps.eventType && (
                <span className="custom-event-type ml-1 opacity-80 text-xs">{extendedProps.eventType}</span>
            )}

            {/* Add an icon if it's a multi-day event */}
            {extendedProps.isMultiDay && (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <title>This event spans multiple days</title>
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            )}
        </div>
    );
}