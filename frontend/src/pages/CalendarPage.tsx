import MainLayout from '../layouts/MainLayout';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import * as eventService from '../services/eventService';
import type { CalendarEvent, CreateEventDefinitionPayload  } from '../services/eventService';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type SelectedInfoType = DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
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
                    eventService.getEventDefinitions()
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
    }, []);

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
                eventService.getEventDefinitions()
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
    }, []); // Empty dependency array means this function is stable

    useEffect(() => {
        // Now the effect just calls the function
        fetchAndSetData();
    }, [fetchAndSetData]); // Depend on the stable function

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
        // Update the events state by removing the event from the calendar
        const calendarApi = calendarRef.current?.getApi();
        calendarApi?.getEventById(eventToDelete.id)?.remove();
        
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
        const toLocalISOString = (date: Date) => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
            return localISOTime;
        };

        if (eventToEdit) {
            return {
                id: eventToEdit.id,
                title: eventToEdit.title,
                startStr: eventToEdit.start ? toLocalISOString(eventToEdit.start) : '',
                endStr: eventToEdit.end ? toLocalISOString(eventToEdit.end) : '',
                customEventId: eventToEdit.extendedProps.definitionId,
                roomName: eventToEdit.extendedProps.roomName,
                maximumAttendees: eventToEdit.extendedProps.maxAttendees,
                minimumAttendees: eventToEdit.extendedProps.minAttendees,
                statusName: eventToEdit.extendedProps.statusName,
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
                        <button
                            onClick={handleOpenDefinitionModal}
                            className="flex items-center rounded-md bg-custom-primary px-2 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-gray-500 transition ease-in-out duration-150"
                         >
                            Add Event Type
                        </button>
                        <button
                            onClick={handleAddEventClick}
                            className="block rounded-md bg-custom-secondary px-2 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary"
                        >
                            Schedule Event
                        </button>
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
                    <div className="bg-white dark:bg-dark-div p-4 rounded-lg shadow">
                        <FullCalendar
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView="dayGridMonth"
                            headerToolbar={{
                                left: 'prev,next today',
                                center: 'title',
                                right: 'dayGridMonth,timeGridWeek,timeGridDay'
                            }}
                            editable={true}
                            selectable={true}
                            selectMirror={true}
                            dayMaxEvents={true}
                            eventClick={handleEventClick}
                            dateClick={handleDateClick}
                            select={handleSelect}
                            events={events}
                            eventContent={renderEventContent}
                            ref={calendarRef}
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
    const { extendedProps } = eventInfo.event;
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const timeText = eventInfo.timeText && !isMonthView ? eventInfo.timeText : '';

    // Use a default color if none is provided by the event data
    const eventColor = extendedProps.color || '#243966';

    return (
        <div
            className="custom-calendar-event"
            style={{ 
                backgroundColor: eventColor,
                borderLeft: `3px solid ${eventColor}` 
            }}
            title={`${eventInfo.event.title} (${extendedProps.eventType})`}
        >
            <div className="custom-event-content">
                {/* For week/day views, show the time */}
                {timeText && <span className="custom-event-time">{timeText}</span>}
                
                {/* Always show the event title */}
                <span className="custom-event-title">{eventInfo.event.title}</span>

                {/* In month view, also show the event type if space allows */}
                {isMonthView && extendedProps.eventType && (
                    <span className="custom-event-type">{extendedProps.eventType}</span>
                )}
            </div>
        </div>
    );
}