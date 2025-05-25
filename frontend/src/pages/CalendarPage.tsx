import CalendarLayout from '../layouts/CalendarLayout';
import React, { useState } from 'react'; // Added useState
import { useAuth } from '../hooks/useAuth';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; 
import type { EventContentArg, DateSelectArg, EventClickArg } from '@fullcalendar/core';
import type { DateClickArg } from '@fullcalendar/interaction';
import { PlusCircle } from 'lucide-react'; 

// Need to move the pop up menu to the components folder eventually 
interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: { 
        title: string; 
        start: string; 
        end: string; 
        allDay: boolean; 
        eventType: string; 
        relevantParties: string; 
    }) => void;
    initialData?: { 
        startStr: string; 
        endStr: string; 
        allDay: boolean; 
        title?: string; 
        eventType?: string; 
        relevantParties?: string; 
    };
}

// Basic mock data for the types of events and roles people may have.
const eventTypes = ['Meeting', 'HealthCheck', 'Training', 'Report'];
const parties = ['HR team', 'Employees', 'Supervisors'];

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [eventDate, setEventDate] = useState(initialData?.startStr ? initialData.startStr.split('T')[0] : new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState(initialData?.startStr && initialData.startStr.includes('T') ? initialData.startStr.split('T')[1].substring(0,5) : '09:00');
    const [endTime, setEndTime] = useState(initialData?.endStr && initialData.endStr.includes('T') ? initialData.endStr.split('T')[1].substring(0,5) : '10:00');
    const [allDay, setAllDay] = useState(initialData?.allDay !== undefined ? initialData.allDay : true);
    const [eventType, setEventType] = useState(initialData?.eventType || eventTypes[0]);
    const [relevantParties, setRelevantParties] = useState(initialData?.relevantParties || parties[0]);

    React.useEffect(() => {
        if (isOpen) { 
            if (initialData) {
                setTitle(initialData.title || '');
                setEventDate(initialData.startStr.split('T')[0]);
                setAllDay(initialData.allDay);
                if (initialData.startStr.includes('T')) {
                    setStartTime(initialData.startStr.split('T')[1].substring(0,5));
                }
                if (initialData.endStr.includes('T')) {
                    setEndTime(initialData.endStr.split('T')[1].substring(0,5));
                }
                setEventType(initialData.eventType || eventTypes[0]);
                setRelevantParties(initialData.relevantParties || parties[0]);
            } else {
                setTitle('');
                setEventDate(new Date().toISOString().split('T')[0]);
                setStartTime('09:00');
                setEndTime('10:00');
                setAllDay(true);
                setEventType(eventTypes[0]);
                setRelevantParties(parties[0]);
            }
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (title) {
            const start = allDay ? eventDate : `${eventDate}T${startTime}`;
            const end = allDay ? eventDate : `${eventDate}T${endTime}`;
            onSave({
                title,
                start,
                end,
                allDay,
                eventType,
                relevantParties
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-6 text-custom-text dark:text-dark-text">Add New Event</h2>
                
                <div className="mb-4">
                    <label htmlFor="eventTitle" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Title</label>
                    <input 
                        id="eventTitle"
                        type="text" 
                        placeholder="Enter event title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text dark:placeholder-gray-500"
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="eventType" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Type</label>
                    <select
                        id="eventType"
                        value={eventType}
                        onChange={(e) => setEventType(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text"
                    >
                        {eventTypes.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="relevantParties" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Relevant Parties</label>
                    <select
                        id="relevantParties"
                        value={relevantParties}
                        onChange={(e) => setRelevantParties(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text"
                    >
                        {parties.map(party => (
                            <option key={party} value={party}>{party}</option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="eventDate" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Date</label>
                    <input 
                        id="eventDate"
                        type="date" 
                        value={eventDate}
                        onChange={(e) => setEventDate(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text"
                    />
                </div>

                <div className="mb-4 flex items-center">
                    <input 
                        id="allDay" 
                        type="checkbox" 
                        checked={allDay} 
                        onChange={(e) => setAllDay(e.target.checked)} 
                        className="h-4 w-4 text-custom-primary dark:text-dark-primary border-gray-300 dark:border-dark-input rounded focus:ring-custom-primary dark:focus:ring-dark-primary dark:ring-offset-dark-div dark:bg-dark-input"
                    />
                    <label htmlFor="allDay" className="ml-2 block text-sm text-custom-text dark:text-dark-text">All-day event</label>
                </div>

                {!allDay && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label htmlFor="startTime" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Start Time</label>
                            <input 
                                id="startTime"
                                type="time" 
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text"
                            />
                        </div>
                        <div>
                            <label htmlFor="endTime" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">End Time</label>
                            <input 
                                id="endTime"
                                type="time" 
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-dark-input rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text"
                            />
                        </div>
                    </div>
                )}

                <div className="flex justify-end space-x-3 pt-2">
                    <button 
                        onClick={onClose} 
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-custom-text dark:text-dark-text rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-dark-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-dark-div"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSubmit} 
                        className="px-4 py-2 bg-custom-primary hover:bg-opacity-90 dark:hover:bg-opacity-90 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary dark:focus:ring-offset-dark-div dark:focus:ring-dark-primary"
                    >
                        Save Event
                    </button>
                </div>
            </div>
        </div>
    );
};

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);
    // Ensure selectedDateInfo can hold the new fields if you plan to pre-fill them from event clicks later
    const [selectedDateInfo, setSelectedDateInfo] = useState<DateSelectArg | DateClickArg | (EventClickArg['event'] & { eventType?: string; relevantParties?: string }) | null>(null);
    const calendarRef = React.useRef<FullCalendar>(null);

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
        alert('Event Title: ' + clickInfo.event.title);
    };

    const handleSaveEvent = (eventData: { 
        title: string; 
        start: string; 
        end: string; 
        allDay: boolean; 
        eventType: string; 
        relevantParties: string; 
    }) => {
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
                    const calendarApi = calendarRef.current?.getApi();
                    calendarApi?.unselect();
                }}
                onSave={handleSaveEvent}
                initialData={selectedDateInfo ? {
                    startStr: 'startStr' in selectedDateInfo ? selectedDateInfo.startStr : (selectedDateInfo as DateClickArg).dateStr,
                    endStr: 'endStr' in selectedDateInfo ? selectedDateInfo.endStr : (selectedDateInfo as DateClickArg).dateStr,
                    allDay: selectedDateInfo.allDay !== undefined ? selectedDateInfo.allDay : !(('dateStr' in selectedDateInfo && selectedDateInfo.dateStr.includes('T')) || ('startStr' in selectedDateInfo && selectedDateInfo.startStr.includes('T'))),
                    title: 'title' in selectedDateInfo ? selectedDateInfo.title : undefined,
                    eventType: 'eventType' in selectedDateInfo ? selectedDateInfo.eventType : undefined,
                    relevantParties: 'relevantParties' in selectedDateInfo ? selectedDateInfo.relevantParties : undefined,
                 } : undefined}
            />
        </CalendarLayout>
    );
};

export default CalendarPage;

function renderEventContent(eventInfo: EventContentArg) {
    const isMonthView = eventInfo.view.type === 'dayGridMonth';

    return (
        <div 
            className={`overflow-hidden text-ellipsis whitespace-nowrap rounded h-full flex flex-col justify-center
                        ${isMonthView ? 'p-0.5' : 'p-1'} 
                        bg-custom-primary text-white dark:bg-dark-primary`}
            title={eventInfo.event.title} // Show full title on hover
        >
            {eventInfo.timeText && !isMonthView && (
                <span className="font-semibold mr-1">{eventInfo.timeText}</span>
            )}
            <span className="text-xs font-medium">{eventInfo.event.title}</span>
        </div>
    );
}