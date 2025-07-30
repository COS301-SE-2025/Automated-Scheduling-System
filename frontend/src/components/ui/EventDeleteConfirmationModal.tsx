import React, { useState } from 'react';
import * as eventService from '../../services/eventService';

interface EventDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onDeleteSuccess: () => void;
    eventId: number;
    eventName: string;
    isDefinition?: boolean;
}

const EventDeleteConfirmationModal: React.FC<EventDeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onDeleteSuccess,
    eventId,
    eventName,
    isDefinition = false,
}) => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setIsDeleting(true);
        setError(null);
        try {
            if (isDefinition) {
                await eventService.deleteEventDefinition(eventId);
            } else {
                await eventService.deleteScheduledEvent(eventId);
            }
            onDeleteSuccess();
            onClose();
        } catch (err) {
            console.error("Failed to delete:", err);
            const itemType = isDefinition ? 'definition' : 'event';
            setError(`Could not delete the ${itemType}. It might be in use or a server error occurred.`);
        } finally {
            setIsDeleting(false);
        }
    };

    if (!isOpen) return null;

    const itemType = isDefinition ? 'event definition' : 'event';

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold text-custom-text dark:text-dark-text mb-4">
                    Delete {isDefinition ? 'Definition' : 'Event'}
                </h3>
                <p className="text-custom-text dark:text-dark-text mb-6">
                    Are you sure you want to delete the {itemType} <span className="font-semibold">{eventName}</span>? This action cannot be undone.
                </p>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-custom-text dark:text-dark-text rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-dark-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-dark-div disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:bg-red-400"
                    >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventDeleteConfirmationModal;
