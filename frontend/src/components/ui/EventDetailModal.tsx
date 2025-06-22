import React from 'react';
import type { EventClickArg } from '@fullcalendar/core';

export interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: EventClickArg['event'] | null;
    onEdit: (event: EventClickArg['event']) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ isOpen, onClose, event, onEdit }) => {
    if (!isOpen || !event) return null;

    const { title, start, end, allDay, extendedProps } = event;
    const eventType = extendedProps?.eventType || 'N/A';
    const relevantParties = extendedProps?.relevantParties || 'N/A';

    const formatDateTime = (date: Date | null, isAllDay: boolean, isEnd: boolean = false) => {
        if (!date) return 'N/A';
        if (isAllDay) {
            const d = new Date(date);
            if (isEnd) {
                 d.setDate(d.getDate() - 1);
            }
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        }
        return new Date(date).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-md">
                <h2 className="text-xl font-semibold mb-4 text-custom-text dark:text-dark-text">Event Details</h2>
                <div className="space-y-3">
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Title</p>
                        <p className="text-custom-text dark:text-dark-text">{title}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Start</p>
                        <p className="text-custom-text dark:text-dark-text">{formatDateTime(start, allDay)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">End</p>
                        <p className="text-custom-text dark:text-dark-text">{formatDateTime(end, allDay, allDay)}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All-day</p>
                        <p className="text-custom-text dark:text-dark-text">{allDay ? 'Yes' : 'No'}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Event Type</p>
                        <p className="text-custom-text dark:text-dark-text">{eventType}</p>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Relevant Parties</p>
                        <p className="text-custom-text dark:text-dark-text">{relevantParties}</p>
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button
                        onClick={() => onEdit(event)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-custom-text dark:text-dark-text rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-dark-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-dark-div"
                    >
                        Edit
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-custom-primary hover:bg-opacity-90 dark:hover:bg-opacity-90 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-primary dark:focus:ring-offset-dark-div dark:focus:ring-dark-primary"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;