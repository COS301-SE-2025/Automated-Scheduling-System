import CalendarLayout from '../layouts/CalendarLayout';
import React, { useState, useRef } from 'react';
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

type EventSaveData = Parameters<EventFormModalProps['onSave']>[0];
type SelectedInfoType = DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string });

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [clickedEventInfo, setClickedEventInfo] = useState<EventClickArg['event'] | null>(null);
    const [selectedDateInfo, setSelectedDateInfo] = useState<SelectedInfoType | null>(null);
    const calendarRef = useRef<FullCalendar>(null);

    const handleAddEventClick = () => {
        setSelectedDateInfo(null); 
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

    const handleSaveEvent = (eventData: EventSaveData) => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.addEvent({
                
                title: eventData.title,
                start: eventData.start,
                end: eventData.end,
                allDay: eventData.allDay,
                extendedProps: {
                    eventType: eventData.eventType,
                    relevantParties: eventData.relevantParties
                }
            });
            console.log('Event saved with details:', eventData);
        }
        setIsModalOpen(false);
        setSelectedDateInfo(null); 
    };

    const prepareInitialModalData = (): EventFormModalProps['initialData'] | undefined => {
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
            };
        }
        return undefined;
    };


    return (
        <CalendarLayout>
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
                        eventContent={renderEventContent}
                        ref={calendarRef}
                    />
                </div>
            </div>
            <EventFormModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedDateInfo(null); 
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
            />
        </CalendarLayout>
    );
};

export default CalendarPage;

function renderEventContent(eventInfo: EventContentArg) {
    const isMonthView = eventInfo.view.type === 'dayGridMonth';
    const eventType = eventInfo.event.extendedProps.eventType;
    const relevantParties = eventInfo.event.extendedProps.relevantParties;

    let bgColorClass = 'bg-custom-primary dark:bg-dark-primary';

    switch (eventType) {
        case 'Meeting':
            bgColorClass = 'bg-green-500 dark:bg-dark-green';
            break;
        case 'HealthCheck':
            bgColorClass = 'bg-purple-500 dark:bg-dark-purple';
            break;
        case 'Training':
            bgColorClass = 'bg-yellow-700 dark:bg-dark-brown';
            break;
        case 'Report':
            bgColorClass = 'bg-red-500 dark:bg-dark-red';
            break;
    }

    return (
        <div
            className={`overflow-hidden text-ellipsis whitespace-nowrap rounded h-full flex flex-col
                        ${isMonthView ? 'p-0.5 text-xs' : 'p-1 text-sm'}
                        ${bgColorClass} text-white`}
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