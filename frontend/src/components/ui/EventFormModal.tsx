import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as eventService from '../../services/eventService';
import MessageBox from './MessageBox';
import { HexColorPicker } from 'react-colorful';

const scheduleSchema = z.object({
    title: z.string().min(1, "Title is required."),
    customEventId: z.number({ required_error: "You must select an event type." }).min(1, "You must select an event type."),
    start: z.string().min(1, "Start date is required."),
    end: z.string().min(1, "End date is required."),
    roomName: z.string().optional(),
    maximumAttendees: z.number().optional().nullable(),
    minimumAttendees: z.number().optional().nullable(),
    statusName: z.string().optional(),
    color: z.string().optional(),
}).refine(data => new Date(data.start) < new Date(data.end), {
    message: "End date must be after start date.",
    path: ["end"],
}).refine(data => {
    if (
        typeof data.minimumAttendees === "number" &&
        typeof data.maximumAttendees === "number"
    ) {
        return data.maximumAttendees >= data.minimumAttendees;
    }
    return true;
}, {
    message: "Maximum attendees cannot be less than minimum attendees.",
    path: ["maximumAttendees"],
});

type ScheduleFormData = z.infer<typeof scheduleSchema>;

export interface EventFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (eventData: { id?: string } & ScheduleFormData) => void;
    initialData?: {
        id?: string;
        title?: string;
        startStr: string;
        endStr: string;
        customEventId?: number;
        roomName?: string;
        maximumAttendees?: number;
        minimumAttendees?: number;
        statusName?: string;
        color?: string;
    };
    eventDefinitions: eventService.EventDefinition[];
    onNeedDefinition: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData, eventDefinitions, onNeedDefinition }) => {
    const [apiError, setApiError] = useState<string | null>(null);
    const isEditMode = !!initialData?.id;

    const { register, handleSubmit, reset, control, formState: { errors, isSubmitting } } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            color: '#3788d8' // Default color
        }
    });

    const showNoDefinitionsMessage = isOpen && !isEditMode && eventDefinitions.length === 0;

    useEffect(() => {
        if (isOpen && !showNoDefinitionsMessage) {
            if (isEditMode && initialData) {
                // In edit mode, populate with existing data
                reset({
                    title: initialData.title || '',
                    customEventId: initialData.customEventId,
                    start: initialData.startStr,
                    end: initialData.endStr,
                    roomName: initialData.roomName || '',
                    maximumAttendees: initialData.maximumAttendees || 0,
                    minimumAttendees: initialData.minimumAttendees || 0,
                    statusName: initialData.statusName || 'Scheduled',
                    color: initialData.color || '#3788d8',
                });
            } else {
                // In add mode, use defaults
                reset({
                    title: '',
                    customEventId: undefined,
                    start: initialData?.startStr || new Date().toISOString(),
                    end: initialData?.endStr || new Date().toISOString(),
                    roomName: '',
                    maximumAttendees: 0,
                    minimumAttendees: 0,
                    statusName: 'Scheduled',
                    color: '#3788d8',
                });
            }
            setApiError(null);
        }
    }, [isOpen, showNoDefinitionsMessage, initialData, isEditMode, reset]);

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
                        {showNoDefinitionsMessage ? 'Action Required' : (isEditMode ? 'Edit Scheduled Event' : 'Schedule New Event')}
                    </h3>
                    <button type="button" onClick={onClose}>
                         <svg className="w-6 h-6 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                {showNoDefinitionsMessage ? (
                    <div className="p-6">
                        <MessageBox type="info" title="No Event Types Available">
                            <p className="mb-4">
                                To schedule an event, you must first create an event type (a template for events).
                            </p>
                            <button
                                onClick={onNeedDefinition}
                                className="w-full px-4 py-2 bg-custom-secondary text-white rounded-md hover:bg-custom-third focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-secondary"
                            >
                                Create New Event Type
                            </button>
                        </MessageBox>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6">
                        {apiError && <MessageBox type="error" title="Operation Failed">{apiError}</MessageBox>}
                        
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Title</label>
                            <input id="title" {...register('title')} className="w-full p-2 border rounded-md dark:bg-dark-input" placeholder="e.g., Q3 All-Hands Meeting" />
                            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                        </div>

                        <div>
                            <label htmlFor="customEventId" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Type</label>
                            <Controller
                                name="customEventId"
                                control={control}
                                render={({ field }) => (
                                    <select id="customEventId" {...field} onChange={e => field.onChange(parseInt(e.target.value))} className="w-full p-2 border rounded-md dark:bg-dark-input">
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
                                {errors.minimumAttendees && <p className="text-red-500 text-xs mt-1">{errors.minimumAttendees.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="maximumAttendees" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Max Attendees</label>
                                <input id="maximumAttendees" type="number" {...register('maximumAttendees', { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                                {errors.maximumAttendees && <p className="text-red-500 text-xs mt-1">{errors.maximumAttendees.message}</p>}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Color</label>
                            <Controller
                                name="color"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex items-center gap-4">
                                        <HexColorPicker color={field.value} onChange={field.onChange} style={{width: 140, height: 140}} />
                                        <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: field.value }} />
                                        <input
                                            {...field}
                                            className="w-full p-2 border rounded-md dark:bg-dark-input"
                                            placeholder="#3788d8"
                                        />
                                    </div>
                                )}
                            />
                        </div>

                        <div className="flex items-center justify-end pt-4 space-x-3">
                            <button type="button" onClick={onClose} disabled={isSubmitting} className="px-4 py-2 border rounded-md">Cancel</button>
                            <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-custom-primary text-white rounded-md hover:bg-custom-primary-hover">
                                {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Schedule Event')}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default EventFormModal;