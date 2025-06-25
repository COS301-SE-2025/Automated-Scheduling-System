import React from 'react';

interface EventDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    eventName: string;
}

const EventDeleteConfirmationModal: React.FC<EventDeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    eventName
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-custom-background dark:bg-dark-div p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-xl font-semibold text-custom-text dark:text-dark-text mb-4">
                    Delete Event
                </h3>
                <p className="text-custom-text dark:text-dark-text mb-6">
                    Are you sure you want to delete the event <span className="font-semibold">{eventName}</span>? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-custom-text dark:text-dark-text rounded-md shadow-sm hover:bg-gray-100 dark:hover:bg-dark-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-dark-div"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EventDeleteConfirmationModal;
