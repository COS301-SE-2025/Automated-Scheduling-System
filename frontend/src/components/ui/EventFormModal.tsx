import React, { useState, useEffect } from 'react';
import { ColorPicker, type ColorPickerChangeEvent } from 'primereact/colorpicker';
import MessageBox from './MessageBox';

// Basic mock data for the types of events and roles people may have.
// Moved here as they are specific to this form.
const eventTypes = ['Meeting', 'HealthCheck', 'Training', 'Report'];
const parties = ['HR team', 'Employees', 'Supervisors'];

export interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: {
        id?: string;
        title: string;
        start: string;
        end: string;
        allDay: boolean;
        eventType: string;
        relevantParties: string;
        color: string;
    }) => void;
    initialData?: {
        id?: string;
        startStr: string;
        endStr: string;
        allDay: boolean;
        title?: string;
        eventType?: string;
        relevantParties?: string;
        color?: string;
    };
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [id, setId] = useState<string | undefined>(undefined);
    const [title, setTitle] = useState('');
    const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('10:00');
    const [allDay, setAllDay] = useState(true);
    const [eventType, setEventType] = useState(eventTypes[0]);
    const [relevantParties, setRelevantParties] = useState(parties[0]);
    const [color, setColor] = useState('00bac8');
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    // Use useEffect to update state when the modal is opened or initialData changes.
    useEffect(() => {
        if (isOpen) {
            setValidationErrors([]);
            if (initialData) {
                setId(initialData.id);
                setTitle(initialData.title || '');
                setEventDate(initialData.startStr.split('T')[0]);
                setAllDay(initialData.allDay);
                if (initialData.startStr.includes('T')) {
                    setStartTime(initialData.startStr.split('T')[1].substring(0,5));
                } else {
                    setStartTime('09:00');
                }
                if (initialData.endStr.includes('T')) {
                    setEndTime(initialData.endStr.split('T')[1].substring(0,5));
                } else {
                    setEndTime('10:00');
                }
                setEventType(initialData.eventType || eventTypes[0]);
                setRelevantParties(initialData.relevantParties || parties[0]);
                setColor(initialData.color || '00bac8');
            } else {
                // Reset to default for new event
                setId(undefined);
                setTitle('');
                setEventDate(new Date().toISOString().split('T')[0]);
                setStartTime('09:00');
                setEndTime('10:00');
                setAllDay(true);
                setEventType(eventTypes[0]);
                setRelevantParties(parties[0]);
                setColor('00bac8');
            }
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const validateForm = (): boolean => {
        const errors: string[] = [];
        
        if (!title.trim()) {
            errors.push("Event title is required");
        }
        
        if (!allDay) {
            // Compare start and end times when not an all-day event
            const startDateTime = new Date(`${eventDate}T${startTime}`);
            const endDateTime = new Date(`${eventDate}T${endTime}`);
            
            if (startDateTime >= endDateTime) {
                errors.push("Start time must be earlier than end time");
            }
        }
        
        setValidationErrors(errors);
        return errors.length === 0;
    };

    const handleSubmit = () => {
        if (validateForm()) {
            const start = allDay ? eventDate : `${eventDate}T${startTime}`;
            const end = allDay ? eventDate : `${eventDate}T${endTime}`;
            onSave({
                id,
                title,
                start,
                end,
                allDay,
                eventType,
                relevantParties,
                color: color.startsWith('#') ? color.substring(1) : color
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-6 text-custom-text dark:text-dark-text">{initialData?.id ? 'Edit Event' : 'Add New Event'}</h2>
                
                {validationErrors.length > 0 && (
                    <MessageBox type="error" title="Submission Error">
                        {validationErrors.map((error, index) => (
                            <p key={index}>{error}</p>
                        ))}
                    </MessageBox>
                )}

                <div className="mb-4">
                    <label htmlFor="eventTitle" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Title</label>
                    <input
                        id="eventTitle"
                        type="text"
                        placeholder="Enter event title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={`w-full p-3 border rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text dark:placeholder-gray-500 ${
                            validationErrors.includes("Event title is required") 
                                ? "border-red-500 dark:border-red-500" 
                                : "border-gray-300 dark:border-dark-input"
                        }`}
                    />
                </div>

                <div className="mb-4">
                    <label htmlFor="color" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Color</label>
                    <ColorPicker
                        id="color"
                        value={color.startsWith('#') ? color : `#${color}`}
                        onChange={(e: ColorPickerChangeEvent) => setColor(e.value as string)}
                        className="w-full"
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
                                className={`w-full p-3 border rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text ${
                                    validationErrors.includes("Start time must be earlier than end time") 
                                        ? "border-red-500 dark:border-red-500" 
                                        : "border-gray-300 dark:border-dark-input"
                                }`}
                            />
                        </div>
                        <div>
                            <label htmlFor="endTime" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">End Time</label>
                            <input
                                id="endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className={`w-full p-3 border rounded-md shadow-sm focus:ring-custom-primary focus:border-custom-primary dark:bg-dark-input dark:text-dark-text ${
                                    validationErrors.includes("Start time must be earlier than end time") 
                                        ? "border-red-500 dark:border-red-500" 
                                        : "border-gray-300 dark:border-dark-input"
                                }`}
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
                        {initialData?.id ? 'Save Changes' : 'Save Event'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventFormModal;