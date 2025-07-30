import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as eventService from '../../services/eventService';
import MessageBox from './MessageBox';

const eventDefinitionSchema = z.object({
    EventName: z.string().min(1, 'Event name is required'),
    ActivityDescription: z.string().optional(),
    StandardDuration: z.string().min(1, 'Standard duration is required (e.g., 2 hours)'),
    Facilitator: z.string().optional(),
    GrantsCertificateID: z.number().nullable().optional(),
});

type EventDefinitionFormData = z.infer<typeof eventDefinitionSchema>;

export interface EventDefinitionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (definition: eventService.EventDefinition) => void;
    initialData?: eventService.EventDefinition;
}

const EventDefinitionFormModal: React.FC<EventDefinitionFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [apiError, setApiError] = useState<string | null>(null);
    const isEditMode = !!initialData;

    const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<EventDefinitionFormData>({
        resolver: zodResolver(eventDefinitionSchema),
    });

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                reset({
                    EventName: initialData.EventName,
                    ActivityDescription: initialData.ActivityDescription,
                    StandardDuration: initialData.StandardDuration,
                    Facilitator: initialData.Facilitator,
                    GrantsCertificateID: initialData.GrantsCertificateID,
                });
            } else {
                reset({
                    EventName: '',
                    ActivityDescription: '',
                    StandardDuration: '',
                    Facilitator: '',
                    GrantsCertificateID: null,
                });
            }
            setApiError(null);
        }
    }, [isOpen, initialData, reset]);

    const onSubmit = async (data: EventDefinitionFormData) => {
        setApiError(null);
        try {
            const payload = {
                ...data,
                ActivityDescription: data.ActivityDescription || '',
                Facilitator: data.Facilitator || '',
                GrantsCertificateID: data.GrantsCertificateID === null ? undefined : data.GrantsCertificateID,
            };

            let savedDefinition;
            if (isEditMode && initialData) {
                savedDefinition = await eventService.updateEventDefinition(initialData.CustomEventID, payload);
            } else {
                savedDefinition = await eventService.createEventDefinition(payload);
            }
            
            onSave(savedDefinition);
            onClose();
        } catch (err) {
            console.error("Failed to save event definition:", err);
            setApiError("An error occurred while saving the event definition. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">
                        {isEditMode ? 'Edit Event Definition' : 'Add New Event Definition'}
                    </h3>
                    <button type="button" onClick={onClose}>
                        <svg className="w-6 h-6 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
                    {apiError && <MessageBox type="error" title="Operation Failed">{apiError}</MessageBox>}
                    
                    <div>
                        <label htmlFor="EventName" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Name</label>
                        <input id="EventName" {...register('EventName')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        {errors.EventName && <p className="text-red-500 text-xs mt-1">{errors.EventName.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="ActivityDescription" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Description</label>
                        <textarea id="ActivityDescription" {...register('ActivityDescription')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                    </div>

                    <div>
                        <label htmlFor="StandardDuration" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Standard Duration</label>
                        <input id="StandardDuration" {...register('StandardDuration')} placeholder="e.g., 2 hours, 1 day" className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        {errors.StandardDuration && <p className="text-red-500 text-xs mt-1">{errors.StandardDuration.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="Facilitator" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Facilitator</label>
                        <input id="Facilitator" {...register('Facilitator')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                    </div>

                    <div>
                        <label htmlFor="GrantsCertificateID" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Grants Certificate ID (Optional)</label>
                        <input
                            id="GrantsCertificateID"
                            type="number"
                            {...register('GrantsCertificateID', {
                                setValueAs: (v) => v === "" ? null : parseInt(v, 10)
                            })}
                            className="w-full p-2 border rounded-md dark:bg-dark-input"
                        />
                    </div>

                    <div className="flex items-center justify-end pt-4 space-x-3">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-custom-primary text-white rounded-md hover:bg-custom-primary-hover">
                            {isSubmitting ? 'Saving...' : 'Save Definition'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventDefinitionFormModal;