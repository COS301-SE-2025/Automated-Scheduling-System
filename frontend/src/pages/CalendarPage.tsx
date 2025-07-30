import MainLayout from '../layouts/MainLayout';
import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { PlusCircle } from 'lucide-react';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import * as eventService from '../services/eventService';
import type { CalendarEvent } from '../services/eventService';

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

    const handleSaveDefinition = (newDefinition: eventService.EventDefinition) => {
        setEventDefinitions(prev => [...prev, newDefinition]);
        setIsDefinitionModalOpen(false);
        // Re-open the schedule modal for convenience
        setIsModalOpen(true);
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
            
            // Refresh the calendar events
            const calendarApi = calendarRef.current?.getApi();
            calendarApi?.refetchEvents();
            
        } catch (err) {
            console.error('Failed to save event:', err);
            setError('Failed to save event. Please check your connection and try again.');
        } finally {
            setIsModalOpen(false);
            setSelectedDateInfo(null);
            setEventToEdit(null);
        }
    };

    const prepareInitialModalData = (): EventFormModalProps['initialData'] | undefined => {
        if (eventToEdit) {
            return {
                id: eventToEdit.id,
                startStr: eventToEdit.startStr,
                endStr: eventToEdit.endStr,
            };
        }
        if (!selectedDateInfo) return undefined;

        const toLocalISOString = (date: Date) => {
            const tzoffset = (new Date()).getTimezoneOffset() * 60000; //offset in milliseconds
            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, -1);
            return localISOTime.substring(0, 16);
        };

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
            <EventDefinitionFormModal
                isOpen={isDefinitionModalOpen}
                onClose={() => setIsDefinitionModalOpen(false)}
                onSave={handleSaveDefinition}
            />
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
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const eventType = eventInfo.event.extendedProps.eventType;
    const relevantParties = eventInfo.event.extendedProps.relevantParties;
    const rawColor = eventInfo.event.extendedProps.color || eventInfo.event.backgroundColor;
    
    // Ensure the color has a '#' prefix for CSS, otherwise use a default.
    const color = rawColor && rawColor.startsWith('#') 
        ? rawColor 
        : rawColor 
        ? `#${rawColor}` 
        : '#243966';

    return (
        <div
            className={`overflow-hidden text-ellipsis whitespace-nowrap rounded h-full flex flex-col
                        ${isMonthView ? 'p-0.5 text-xs' : 'p-1 text-sm'}
                        text-white`}
            style={{ backgroundColor: color }}
            title={`${eventInfo.event.title} (${eventType} for ${relevantParties})`}
        >
            {eventInfo.timeText && !isMonthView && (
                <span className="font-semibold mr-1">{eventInfo.timeText}</span>
            )}
            <span className="font-medium">{eventInfo.event.title}</span>
            {isMonthView && eventType && (
                <span className="text-xs block truncate">Type: {eventType}</span>
            )}
            {!isMonthView && eventType && (
                <span className="text-xs block">Type: {eventType}</span>
            )}
            {!isMonthView && relevantParties && (
                <span className="text-xs block">For: {relevantParties}</span>
            )}
        </div>
    );
}