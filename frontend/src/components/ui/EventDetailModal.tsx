import React from 'react';
import type { EventClickArg } from '@fullcalendar/core';
import Button from './Button';

export interface EventDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: EventClickArg['event'] | null;
    onEdit: (event: EventClickArg['event']) => void;
    onDelete: (event: EventClickArg['event']) => void;
}

const EventDetailModal: React.FC<EventDetailModalProps> = ({ isOpen, onClose, event, onEdit, onDelete }) => {
    if (!isOpen || !event) return null;

    const { title, start, end, extendedProps } = event;

    const actualEndDate = extendedProps.isMultiDay && extendedProps.originalEnd
        ? new Date(extendedProps.originalEnd)
        : end;

    const formatDateTime = (date: Date | null) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleString(undefined, {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    const DetailItem: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
        <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
            <p className="text-custom-text dark:text-dark-text">{value || 'N/A'}</p>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-lg">
                <h2 className="text-xl font-semibold mb-4 text-custom-text dark:text-dark-text">Event Details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailItem label="Title" value={title} />
                    <DetailItem label="Event Type" value={extendedProps.eventType} />
                    <DetailItem label="Start" value={formatDateTime(start)} />
                    <DetailItem label="End" value={formatDateTime(actualEndDate)} />
                    <DetailItem label="Location" value={extendedProps.roomName} />
                    <DetailItem label="Status" value={extendedProps.statusName} />
                    <DetailItem label="Max Attendees" value={extendedProps.maxAttendees} />
                    <DetailItem label="Min Attendees" value={extendedProps.minAttendees} />
                    <DetailItem label="Created On" value={formatDateTime(new Date(extendedProps.creationDate))} />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <Button onClick={() => onEdit(event)} variant="outline">
                        Edit
                    </Button>
                    <Button onClick={() => onDelete(event)} variant="danger">
                        Delete
                    </Button>
                    <Button onClick={onClose} variant="primary">
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default EventDetailModal;