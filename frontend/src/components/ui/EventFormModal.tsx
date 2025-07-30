import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as eventService from '../../services/eventService';
import MessageBox from './MessageBox';

const scheduleSchema = z.object({
    customEventId: z.number({ required_error: "You must select an event type." }).min(1, "You must select an event type."),
    start: z.string().min(1, "Start date is required."),
    end: z.string().min(1, "End date is required."),
    roomName: z.string().optional(),
    maximumAttendees: z.number().optional().nullable(),
    minimumAttendees: z.number().optional().nullable(),
    statusName: z.string().optional(),
}).refine(data => new Date(data.start) < new Date(data.end), {
    message: "End date must be after start date.",
    path: ["end"],
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: { id?: string } & ScheduleFormData) => void;
    initialData?: {
        id?: string;
        startStr: string;
        endStr: string;
    };
    eventDefinitions: eventService.EventDefinition[];
    onNeedDefinition: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData, eventDefinitions, onNeedDefinition }) => {
    const [apiError, setApiError] = useState<string | null>(null);
    const isEditMode = !!initialData?.id;

    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
    });

    useEffect(() => {
        if (isOpen) {
            if (!isEditMode && eventDefinitions.length === 0) {
                onNeedDefinition();
                return;
            }
            reset({
                start: initialData?.startStr || new Date().toISOString(),
                end: initialData?.endStr || new Date().toISOString(),
                roomName: '',
                maximumAttendees: 0,
                minimumAttendees: 0,
                statusName: 'Scheduled',
            });
            setApiError(null);
        }
    }, [isOpen, initialData, reset, eventDefinitions, isEditMode, onNeedDefinition]);

    const onSubmit = async (data: ScheduleFormData) => {
        setApiError(null);
        try {
            onSave({ id: initialData?.id, ...data });
        } catch (err) {
            console.error("Failed to save event schedule:", err);
            setApiError("An error occurred while saving. Please try again.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-custom-primary dark:text-dark-primary">
                        {isEditMode ? 'Edit Scheduled Event' : 'Schedule New Event'}
                    </h3>
                    <button type="button" onClick={onClose}>
                         <svg className="w-6 h-6 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
                    {apiError && <MessageBox type="error" title="Operation Failed">{apiError}</MessageBox>}
                    
                    <div>
                        <label htmlFor="customEventId" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Type</label>
                        <Controller
                            name="customEventId"
                            control={control}
                            render={({ field }) => (
                                <select {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-dark-input">
                                    <option value="">Select an event type...</option>
                                    {eventDefinitions.map(def => (
                                        <option key={def.CustomEventID} value={def.CustomEventID}>{def.EventName}</option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.customEventId && <p className="text-red-500 text-xs mt-1">{errors.customEventId.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Start Date & Time</label>
                            <input id="start" type="datetime-local" {...register('start')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                            {errors.start && <p className="text-red-500 text-xs mt-1">{errors.start.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="end" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">End Date & Time</label>
                            <input id="end" type="datetime-local" {...register('end')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                            {errors.end && <p className="text-red-500 text-xs mt-1">{errors.end.message}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="roomName" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Location</label>
                        <input id="roomName" {...register('roomName')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="minimumAttendees" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Min Attendees</label>
                            <input id="minimumAttendees" type="number" {...register('minimumAttendees', { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        </div>
                        <div>
                            <label htmlFor="maximumAttendees" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Max Attendees</label>
                            <input id="maximumAttendees" type="number" {...register('maximumAttendees', { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        </div>
                    </div>

                    <div className="flex items-center justify-end pt-4 space-x-3">
                        <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border rounded-md">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-custom-primary text-white rounded-md hover:bg-custom-primary-hover">
                            {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Schedule Event')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventFormModal;