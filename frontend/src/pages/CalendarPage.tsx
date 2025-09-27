import MainLayout from '../layouts/MainLayout';
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { PlusCircle, Settings } from 'lucide-react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { EventContentArg, DateSelectArg, EventClickArg, EventDropArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import EventFormModal, { type EventFormModalProps } from '../components/ui/EventFormModal';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import EventDetailModal from '../components/ui/EventDetailModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';
import * as eventService from '../services/eventService';
import { ApiError } from '../services/api';
import type { CalendarEvent, CreateEventDefinitionPayload } from '../services/eventService';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/ui/Button';
import { getAllCompetencies } from '../services/competencyService';
import type { Competency } from '../types/competency';

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type SelectedInfoType = DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });

const CalendarPage: React.FC = () => {
    const { permissions, user } = useAuth();
    const isElevated = !!(permissions?.includes('events') && (user?.role === 'Admin' || user?.role === 'HR'));
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
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    // Transient action-level message (e.g., permission denied on drag)
    const [actionMessage, setActionMessage] = useState<string | null>(null);

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
    }, [permissions]);

    // Load competencies only for Admin/HR so the modal can show the grant field
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

    const handleAddEventClick = () => {
        setSelectedDateInfo(null);
        setEventToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenDefinitionModal = () => {
        setIsModalOpen(false); 
        setIsDefinitionModalOpen(true);
    };

    const fetchAndSetData = useCallback(async () => {
        // Preserve the current view and date before refreshing data
    const api = calendarRef.current?.getApi();
    const currentView = api?.view?.type;
    const currentDate = api?.getDate ? api.getDate() : undefined;
    const scroller: HTMLElement | null = (api as any)?.el?.querySelector?.('.fc-timegrid .fc-scroller') || (api as any)?.el?.querySelector?.('.fc-scroller');
    const previousScrollTop = scroller ? scroller.scrollTop : undefined;
        try {
            setIsLoading(true);
            const [schedules, definitions] = await Promise.all([
                eventService.getScheduledEvents(),
                eventService.getEventDefinitions()
            ]);
            // Expand multi-day events into per-day instances while pointing to the same schedule
            const processedSchedules = schedules.flatMap(event => {
                if (!event.start || !event.end) return [event];

                const seriesStart = new Date(event.start as string);
                const seriesEnd = new Date(event.end as string);

                const hStart = seriesStart.getHours();
                const mStart = seriesStart.getMinutes();
                const hEnd = seriesEnd.getHours();
                const mEnd = seriesEnd.getMinutes();

                const startDay = new Date(seriesStart);
                startDay.setHours(0, 0, 0, 0);
                const endDay = new Date(seriesEnd);
                endDay.setHours(0, 0, 0, 0);

                const sameDay = startDay.getTime() === endDay.getTime();
                if (sameDay) {
                    return [{
                        ...event,
                        extendedProps: {
                            ...event.extendedProps,
                            seriesStart: seriesStart.toISOString(),
                            seriesEnd: seriesEnd.toISOString(),
                            seriesId: String(event.extendedProps.scheduleId || event.id),
                        }
                    }];
                }

                const instances: eventService.CalendarEvent[] = [];
                const cur = new Date(startDay);
                while (cur.getTime() <= endDay.getTime()) {
                    const instanceDateStr = cur.toISOString().slice(0, 10); // YYYY-MM-DD
                    const instStart = new Date(cur);
                    instStart.setHours(hStart, mStart, 0, 0);
                    const instEnd = new Date(cur);
                    instEnd.setHours(hEnd, mEnd, 0, 0);
                    // Ensure end is after start for rendering; if not, add 1 hour fallback
                    if (instEnd.getTime() <= instStart.getTime()) {
                        instEnd.setTime(instStart.getTime() + 60 * 60 * 1000);
                    }
                    instances.push({
                        ...event,
                        id: `${event.id}-${instanceDateStr}`,
                        start: instStart.toISOString(),
                        end: instEnd.toISOString(),
                        extendedProps: {
                            ...event.extendedProps,
                            seriesStart: seriesStart.toISOString(),
                            seriesEnd: seriesEnd.toISOString(),
                            seriesId: String(event.extendedProps.scheduleId || event.id),
                            instanceDate: instanceDateStr,
                        }
                    });
                    cur.setDate(cur.getDate() + 1);
                }
                return instances;
            });

            setEvents(processedSchedules);
            setEventDefinitions(definitions);
            setError(null);
            // Restore the preserved view and date so the user stays where they were
            if (api && currentView && currentDate) {
                // Use a microtask to ensure FC has applied state updates before changing view
                setTimeout(() => {
                    api.changeView(currentView, currentDate);
                    // Restore scroll position in time-grid views
                    const newScroller: HTMLElement | null = (api as any)?.el?.querySelector?.('.fc-timegrid .fc-scroller') || (api as any)?.el?.querySelector?.('.fc-scroller');
                    if (previousScrollTop != null && newScroller) {
                        newScroller.scrollTop = previousScrollTop;
                    }
                }, 0);
            }
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
            // Compute delta using oldEvent if available for robust ms precision
            const oldStart: Date | undefined = (dropInfo as any).oldEvent?.start;
            const deltaMs = oldStart ? (event.start!.getTime() - oldStart.getTime()) : (() => {
                const d: any = (dropInfo as any).delta || {};
                const days = d.days || 0;
                const milliseconds = d.milliseconds || 0;
                return days * 24 * 60 * 60 * 1000 + milliseconds;
            })();

            const seriesStart = new Date(event.extendedProps.seriesStart || event.start!.toISOString());
            const seriesEnd = new Date(event.extendedProps.seriesEnd || (event.end ? event.end.toISOString() : event.start!.toISOString()));
            const newStart = new Date(seriesStart.getTime() + deltaMs);
            const newEnd = new Date(seriesEnd.getTime() + deltaMs);

            const scheduleData: eventService.CreateSchedulePayload = {
                title: event.title,
                customEventId: event.extendedProps.definitionId,
                roomName: event.extendedProps.roomName,
                maxAttendees: event.extendedProps.maxAttendees,
                minAttendees: event.extendedProps.minAttendees,
                statusName: event.extendedProps.statusName,
                color: event.extendedProps.color,
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
            };

            await eventService.updateScheduledEvent(Number(event.extendedProps.scheduleId), scheduleData);
            await fetchAndSetData();
        } catch (err: any) {
            // Revert UI immediately
            dropInfo.revert();
            if (err instanceof ApiError && err.status === 403) {
                setActionMessage('You are not permitted to move this event. Only the creator or an Admin/HR can modify it.');
            } else {
                setActionMessage('Failed to update event. Please try again.');
            }
            console.error('Failed to update event after drop:', err);
        }
    };

    const handleEventResize = async (resizeInfo: any) => {
        const { event } = resizeInfo;
        try {
            const seriesStart = new Date(event.extendedProps.seriesStart || event.start!.toISOString());
            const seriesEnd = new Date(event.extendedProps.seriesEnd || (event.end ? event.end.toISOString() : event.start!.toISOString()));

            // Calculate new seriesStart/seriesEnd based on deltas
            const startDelta: any = (resizeInfo as any).startDelta || {};
            const endDelta: any = (resizeInfo as any).endDelta || {};
            const deltaToMs = (d: any) => (d.days || 0) * 86400000 + (d.milliseconds || 0);

            const newStart = new Date(seriesStart.getTime() + deltaToMs(startDelta));
            const newEnd = new Date(seriesEnd.getTime() + deltaToMs(endDelta));

            const scheduleData: eventService.CreateSchedulePayload = {
                title: event.title,
                customEventId: event.extendedProps.definitionId,
                roomName: event.extendedProps.roomName,
                maxAttendees: event.extendedProps.maxAttendees,
                minAttendees: event.extendedProps.minAttendees,
                statusName: event.extendedProps.statusName,
                color: event.extendedProps.color,
                start: newStart.toISOString(),
                end: newEnd.toISOString(),
            };
            await eventService.updateScheduledEvent(Number(event.extendedProps.scheduleId), scheduleData);
            await fetchAndSetData();
        } catch (e) {
            console.error('Failed to update event after resize:', e);
            (resizeInfo.revert as any)?.();
        }
    };

    const handleSaveEvent = async (eventData: EventSaveData) => {
        try {
            const baseData: eventService.CreateSchedulePayload = {
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

            const scheduleData: eventService.CreateSchedulePayload = isElevated
                ? {
                    ...baseData,
                    employeeNumbers: (eventData as any).employeeNumbers,
                    positionCodes: (eventData as any).positionCodes,
                }
                : baseData;

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
            // Use the original full range for multi-day series when editing
            const startDate = eventToEdit.extendedProps.seriesStart || eventToEdit.start;
            const endDate = eventToEdit.extendedProps.seriesEnd || eventToEdit.end;
            return {
        id: String(eventToEdit.extendedProps.scheduleId),
                title: eventToEdit.title,
                startStr: startDate ? toLocalISOString(startDate as string) : '',
                endStr: endDate ? toLocalISOString(endDate as string) : '',
                customEventId: eventToEdit.extendedProps.definitionId,
                roomName: eventToEdit.extendedProps.roomName,
                maximumAttendees: eventToEdit.extendedProps.maxAttendees,
                minimumAttendees: eventToEdit.extendedProps.minAttendees,
                statusName: eventToEdit.extendedProps.statusName,
                color: eventToEdit.extendedProps.color,
                employeeNumbers: eventToEdit.extendedProps.employees || [],
                positionCodes: eventToEdit.extendedProps.positions || [],
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
                    <h1 className="text-2xl font-semibold text-custom-text dark:text-dark-text">View Events On Your Calendar</h1>
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

                {!error && (
                    <div className="bg-white dark:bg-dark-div p-4 rounded-lg shadow calendar-container relative">
                        {/* Non-blocking loading veil to avoid unmounting the calendar */}
                        {isLoading && (
                            <div className="absolute inset-0 flex items-start justify-end p-2 pointer-events-none">
                                <span className="text-xs bg-white/80 dark:bg-black/40 text-gray-600 dark:text-gray-200 rounded px-2 py-1 shadow">Refreshing…</span>
                            </div>
                        )}
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
                            eventResize={handleEventResize}
                            eventAllow={(_dropInfo, draggedEvent) => {
                                if (!draggedEvent) return false;
                                return (draggedEvent as any).extendedProps?.canEdit === true;
                            }}
                        />
                        {actionMessage && (
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded shadow text-sm flex items-center gap-2 z-10">
                                <span>{actionMessage}</span>
                                <button
                                    type="button"
                                    aria-label="Dismiss message"
                                    className="text-yellow-700 dark:text-yellow-300 hover:underline"
                                    onClick={() => setActionMessage(null)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        )}
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
                    competencies={competencies}
                    showGrantField={user?.role === 'Admin' || user?.role === 'HR'}
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
                    eventId={Number((eventToDelete as any).extendedProps?.scheduleId)}
                    eventName={eventToDelete.title}
                />
            )}
        </MainLayout>
    );
};

export default CalendarPage;

function renderEventContent(eventInfo: EventContentArg) {
    const { extendedProps, start, end } = eventInfo.event;
    const title = eventInfo.event.title;
    const formatTime = (d?: Date | null) => {
        if (!d) return '';
        const h = d.getHours();
        const m = d.getMinutes();
        const ampm = h >= 12 ? 'PM' : 'AM';
        const hh = h % 12 === 0 ? 12 : h % 12;
        const mm = m.toString().padStart(2, '0');
        return `${hh}:${mm} ${ampm}`;
    };
    const timeRange = `${formatTime(start)} - ${formatTime(end)}`;

    const eventStyle = {
        backgroundColor: extendedProps.color || '#3788d8',
        color: '#ffffff',
        padding: '2px 4px',
        borderRadius: '3px',
        borderColor: '#6b6f72ff',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '2px',
        height: '100%',
    };

    return (
        <div style={eventStyle} className="custom-calendar-event" title={`${title} (${extendedProps.eventType || ''})`}>
            <span className="custom-event-title text-sm leading-tight">{title}</span>
            <span className="custom-event-time text-[10px] opacity-90">{timeRange}</span>
        </div>
    );
}