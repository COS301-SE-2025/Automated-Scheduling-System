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
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import * as eventService from '../services/eventService';
import type { CalendarEvent } from '../services/eventService';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type SelectedInfoType = DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [clickedEventInfo, setClickedEventInfo] = useState<EventClickArg['event'] | null>(null);
    const [selectedDateInfo, setSelectedDateInfo] = useState<SelectedInfoType | null>(null);
    const [eventToEdit, setEventToEdit] = useState<EventClickArg['event'] | null>(null);
    const [eventToDelete, setEventToDelete] = useState<EventClickArg['event'] | null>(null);
    const calendarRef = useRef<FullCalendar>(null);
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                setIsLoading(true);
                // Using correct getScheduledEvents function
                const fetchedEvents = await eventService.getScheduledEvents();
                setEvents(fetchedEvents);
                setError(null);
            } catch (err) {
                console.error("Failed to fetch events:", err);
                setError("Could not load calendar events.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchEvents();
    }, []);

    const handleAddEventClick = () => {
        setSelectedDateInfo(null);
        setEventToEdit(null);
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

    const handleConfirmDelete = async () => {
        if (eventToDelete) {
            try {
                // Convert string ID to number for deleteScheduledEvent
                await eventService.deleteScheduledEvent(Number(eventToDelete.id));
                
                // Update the events state
                const calendarApi = calendarRef.current?.getApi();
                calendarApi?.getEventById(eventToDelete.id)?.remove();
                
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
                // Convert to format expected by updateScheduledEvent
                const scheduleData: Partial<eventService.CreateSchedulePayload> = {
                    start: eventData.start,
                    end: eventData.end,
                    roomName: 'Default Room', // Add appropriate mapping
                };
                
                await eventService.updateScheduledEvent(Number(eventData.id), scheduleData);
            } else {
                // Convert to format expected by createScheduledEvent
                const scheduleData: eventService.CreateSchedulePayload = {
                    customEventId: 1, // Appropriate ID based on event type
                    start: eventData.start,
                    end: eventData.end,
                    roomName: 'Default Room', // Add appropriate mapping
                    statusName: 'Scheduled',
                };
                
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
                title: eventToEdit.title,
                startStr: eventToEdit.startStr,
                endStr: eventToEdit.endStr,
                allDay: eventToEdit.allDay,
                eventType: eventToEdit.extendedProps.eventType,
                relevantParties: eventToEdit.extendedProps.relevantParties,
                color: eventToEdit.extendedProps.color,
            };
        }
        if (!selectedDateInfo) return undefined;

        if ('dateStr' in selectedDateInfo && !('startStr' in selectedDateInfo)) {
            const dateClick = selectedDateInfo as DateClickArg;
            return {
                startStr: dateClick.dateStr,
                endStr: dateClick.dateStr,
                allDay: !dateClick.dateStr.includes('T'),

            };
        }

        if ('startStr' in selectedDateInfo) {
            const selectableInfo = selectedDateInfo as DateSelectArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });
            return {
                startStr: selectableInfo.startStr,
                endStr: selectableInfo.endStr,
                allDay: selectableInfo.allDay,
                title: 'title' in selectableInfo ? selectableInfo.title : undefined,

                eventType: ('extendedProps' in selectableInfo && selectableInfo.extendedProps?.eventType) ? selectableInfo.extendedProps.eventType : undefined,

                relevantParties: ('extendedProps' in selectableInfo && selectableInfo.extendedProps?.relevantParties) ? selectableInfo.extendedProps.relevantParties : undefined,
                color: ('extendedProps' in selectableInfo && selectableInfo.extendedProps?.color) ? selectableInfo.extendedProps.color : undefined,
            };
        }
        return undefined;
    };


    return (
        <MainLayout pageTitle='Calendar'>
            <div>
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-semibold text-custom-text dark:text-dark-text">Calendar - {user?.name || 'User'}</h1>
                    <button
                        onClick={handleAddEventClick}
                        className="flex items-center px-4 py-2 bg-custom-primary text-white rounded-lg shadow hover:bg-custom-primary-hover focus:outline-none focus:ring-2 focus:ring-custom-primary focus:ring-opacity-50 transition ease-in-out duration-150"
                    >
                        <PlusCircle size={20} className="mr-2" />
                        Add Event
                    </button>
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
                    onConfirm={handleConfirmDelete}
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