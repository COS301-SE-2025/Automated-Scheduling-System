import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import MainLayout from '../layouts/MainLayout';
import * as eventService from '../services/eventService';
import type { EventDefinition, CreateEventDefinitionPayload  } from '../services/eventService';
import { Edit, Trash2, AlertCircle, BookCopy } from 'lucide-react';
import EventDefinitionFormModal from '../components/ui/EventDefinitionFormModal';
import EventDeleteConfirmationModal from '../components/ui/EventDeleteConfirmationModal';

const EventDefinitionsPage: React.FC = () => {
    const { user } = useAuth();
    const [definitions, setDefinitions] = useState<EventDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [definitionToEdit, setDefinitionToEdit] = useState<EventDefinition | null>(null);
    const [definitionToDelete, setDefinitionToDelete] = useState<EventDefinition | null>(null);

    const fetchDefinitions = useCallback(async () => {
        try {
            setIsLoading(true);
            const fetchedDefinitions = await eventService.getEventDefinitions();
            setDefinitions(fetchedDefinitions);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch event definitions:", err);
            setError("Could not load event definitions. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDefinitions();
    }, [fetchDefinitions]);

    const handleAddClick = () => {
        setDefinitionToEdit(null);
        setIsFormModalOpen(true);
    };

    const handleEditClick = (definition: EventDefinition) => {
        setDefinitionToEdit(definition);
        setIsFormModalOpen(true);
    };

    const handleDeleteRequest = (definition: EventDefinition) => {
        setDefinitionToDelete(definition);
        setIsDeleteModalOpen(true);
    };

    const handleSaveDefinition = async (definitionData: CreateEventDefinitionPayload) => {
        try {
            if (definitionToEdit) {
                // Assuming you have an update function in your service
                await eventService.updateEventDefinition(definitionToEdit.CustomEventID, definitionData);
            } else {
                await eventService.createEventDefinition(definitionData);
            }
            
            await fetchDefinitions(); // Refetch all definitions to get the latest state
            setIsFormModalOpen(false);
            setDefinitionToEdit(null);
        } catch (err) {
            console.error("Failed to save event definition:", err);
            // Optionally, set an error state to show in the modal or on the page
            setError("Failed to save the definition.");
        }
    };

    
    const handleDeletionSuccess = () => {
        if (!definitionToDelete) return;
        setDefinitions(prev => prev.filter(d => d.CustomEventID !== definitionToDelete.CustomEventID));
        setIsDeleteModalOpen(false);
        setDefinitionToDelete(null);
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="mt-6 flex justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-custom-secondary"></div>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex items-center justify-center gap-2 text-red-500 col-span-full bg-red-100 dark:bg-red-900/20 p-4 rounded-lg mt-6">
                    <AlertCircle size={20} />
                    <p className="font-semibold">{error}</p>
                </div>
            );
        }
        if (definitions.length === 0) {
            return (
                <div className="mt-6 text-center py-10 bg-white dark:bg-dark-input rounded-md shadow">
                    <p className="text-custom-third dark:text-dark-secondary">No event definitions found. Get started by adding one!</p>
                </div>
            );
        }
        return (
            <div className="mt-6 flow-root">
                <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-dark-input">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary sm:pl-6">Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Duration</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Facilitator</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-custom-primary dark:text-dark-primary">Description</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-dark-input">
                                    {definitions.map((def) => (
                                        <tr key={def.CustomEventID}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-white sm:pl-6">{def.EventName}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{def.StandardDuration}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">{def.Facilitator || 'N/A'}</td>
                                            <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={def.ActivityDescription}>{def.ActivityDescription}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                <div className="flex items-center justify-end space-x-4">
                                                    <button onClick={() => handleEditClick(def)} className="text-custom-secondary hover:text-custom-third dark:text-dark-third dark:hover:text-dark-secondary"><Edit size={18} /></button>
                                                    <button onClick={() => handleDeleteRequest(def)} className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"><Trash2 size={18} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <MainLayout pageTitle="Event Definitions">
            <div className="px-4 sm:px-6 lg:px-8 py-8">
                <div className="sm:flex sm:items-center">
                    <div className="sm:flex-auto">
                        <h1 className="text-2xl font-semibold text-custom-primary dark:text-dark-primary">Event Definitions</h1>
                        <p className="mt-2 text-sm text-custom-third dark:text-dark-secondary">
                            Manage the templates for all schedulable events.
                        </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                        <button
                            onClick={handleAddClick}
                            className="block rounded-md bg-custom-secondary px-3 py-2 text-center text-sm font-semibold text-white shadow-sm hover:bg-custom-third focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-custom-secondary"
                        >
                            <BookCopy size={20} className="inline-block mr-2" />
                            Add Definition
                        </button>
                    </div>
                </div>

                {renderContent()}
            </div>

            {user?.role === 'Admin' && (
                <>
                    <EventDefinitionFormModal
                        isOpen={isFormModalOpen}
                        onClose={() => setIsFormModalOpen(false)}
                        onSave={handleSaveDefinition}
                        initialData={definitionToEdit || undefined}
                    />
                    {definitionToDelete && (
                        <EventDeleteConfirmationModal
                            isOpen={isDeleteModalOpen}
                            onClose={() => setIsDeleteModalOpen(false)}
                            onDeleteSuccess={handleDeletionSuccess}
                            eventId={definitionToDelete.CustomEventID}
                            eventName={definitionToDelete.EventName}
                            isDefinition={true}
                        />
                    )}
                </>
            )}
        </MainLayout>
    );
};

export default EventDefinitionsPage;