import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { EventDefinition, CreateEventDefinitionPayload  } from '../../services/eventService';
import { getAllCompetencies } from '../../services/competencyService';
import type { Competency } from '../../types/competency';
import MessageBox from './MessageBox';
import Button from './Button';

const eventDefinitionSchema = z.object({
    EventName: z.string().trim().min(1, 'Event name is required'),
    ActivityDescription: z.string().optional(),
    durationAmount: z.coerce.number({ invalid_type_error: 'Please enter a number' })
        .positive('Duration must be greater than 0'),
    durationUnit: z.enum(['minutes', 'hours', 'days'], {
        required_error: 'Please select a unit',
        invalid_type_error: 'Invalid unit',
    }),
    Facilitator: z.string().optional(),
    GrantsCertificateID: z.coerce.number().int().positive().optional().or(z.undefined()),
});

type EventDefinitionFormData = z.infer<typeof eventDefinitionSchema>;

export interface EventDefinitionFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: CreateEventDefinitionPayload) => void;
    initialData?: EventDefinition;
}

const EventDefinitionFormModal: React.FC<EventDefinitionFormModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
    const [apiError, setApiError] = useState<string | null>(null);
    const [competencies, setCompetencies] = useState<Competency[]>([]);
    const [compLoading, setCompLoading] = useState(false);
    const [compError, setCompError] = useState<string | null>(null);
    const isEditMode = !!initialData;

    const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<EventDefinitionFormData>({
        resolver: zodResolver(eventDefinitionSchema),
        mode: 'onBlur',
        reValidateMode: 'onChange',
        defaultValues: {
            EventName: '',
            ActivityDescription: '',
            durationAmount: 1,
            durationUnit: 'hours',
            Facilitator: '',
            GrantsCertificateID: undefined,
        },
    });

    useEffect(() => {
        if (isOpen) {
            const parseDuration = (value?: string): { amount: number; unit: 'minutes'|'hours'|'days' } => {
                if (!value) return { amount: 1, unit: 'hours' };
                const match = value.match(/([0-9]+(?:\.[0-9]+)?)\s*(minutes?|hours?|days?|m|h|d)/i);
                if (match) {
                    const amt = parseFloat(match[1]) || 1;
                    const rawUnit = match[2].toLowerCase();
                    const unit = rawUnit.startsWith('m') && rawUnit !== 'months' ? 'minutes'
                        : rawUnit.startsWith('h') ? 'hours'
                        : 'days';
                    return { amount: amt, unit } as const;
                }
                return { amount: 1, unit: 'hours' };
            };

            if (initialData) {
                const parsed = parseDuration(initialData.StandardDuration);
                reset({
                    EventName: initialData.EventName,
                    ActivityDescription: initialData.ActivityDescription,
                    durationAmount: parsed.amount,
                    durationUnit: parsed.unit,
                    Facilitator: initialData.Facilitator,
                    GrantsCertificateID: initialData.GrantsCertificateID ?? undefined,
                });
            } else {
                reset({
                    EventName: '',
                    ActivityDescription: '',
                    durationAmount: 1,
                    durationUnit: 'hours',
                    Facilitator: '',
                    GrantsCertificateID: undefined,
                });
            }
            setApiError(null);
        }
    }, [isOpen, initialData, reset, setValue]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        (async () => {
            try {
                setCompLoading(true);
                setCompError(null);
                const list = await getAllCompetencies();
                if (!active) return;
                setCompetencies(list.filter(c => c.isActive));
            } catch (e: any) {
                if (!active) return;
                setCompError(e?.message ?? 'Failed to load competencies');
                setCompetencies([]);
            } finally {
                if (active) setCompLoading(false);
            }
        })();
        return () => { active = false; };
        }
    , [isOpen]);

    const onSubmit = async (data: EventDefinitionFormData) => {
        setApiError(null);
        
        const unitLabel = data.durationUnit;
        const amount = data.durationAmount;
        const standardDuration = `${amount} ${unitLabel}`; 

        const payload: CreateEventDefinitionPayload = {
            EventName: data.EventName,
            ActivityDescription: data.ActivityDescription || '',
            StandardDuration: standardDuration,
            Facilitator: data.Facilitator || '',
            GrantsCertificateID: data.GrantsCertificateID,
        };

        onSave(payload);
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
                    {compError && <MessageBox type="error" title="Failed to load competencies">{compError}</MessageBox>}
                    
                    <div>
                        <label htmlFor="EventName" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Name<span className="text-red-500">*</span></label>
                        <input id="EventName" {...register('EventName')} className="w-full p-2 border rounded-md dark:bg-dark-input" aria-invalid={!!errors.EventName} />
                        {errors.EventName && <p className="text-red-500 text-xs mt-1">{errors.EventName.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="ActivityDescription" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Description</label>
                        <textarea id="ActivityDescription" {...register('ActivityDescription')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        {errors.ActivityDescription && <p className="text-red-500 text-xs mt-1">{errors.ActivityDescription.message}</p>}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Standard Duration<span className="text-red-500">*</span></label>
                        <div className="flex gap-2">
                            <input
                                id="durationAmount"
                                type="number"
                                min={0.1}
                                step={0.1}
                                className="w-24 p-2 border rounded-md dark:bg-dark-input"
                                {...register('durationAmount')}
                                aria-invalid={!!errors.durationAmount}
                            />
                            <select
                                id="durationUnit"
                                className="p-2 border rounded-md dark:bg-dark-input"
                                {...register('durationUnit')}
                                aria-invalid={!!errors.durationUnit}
                            >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                                <option value="days">days</option>
                            </select>
                        </div>
                        {errors.durationAmount && <p className="text-red-500 text-xs mt-1">{errors.durationAmount.message}</p>}
                        {errors.durationUnit && <p className="text-red-500 text-xs mt-1">{errors.durationUnit.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="Facilitator" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Facilitator</label>
                        <input id="Facilitator" {...register('Facilitator')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                        {errors.Facilitator && <p className="text-red-500 text-xs mt-1">{errors.Facilitator.message}</p>}
                    </div>

                    <div>
                        <label htmlFor="GrantsCertificateID" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Grants Certificate (Optional)</label>
                        {competencies.length === 0 ? (
                            <select id="GrantsCertificateID" className="w-full p-2 border rounded-md dark:bg-dark-input" disabled>
                                <option value="">No competencies available</option>
                            </select>
                        ) : (
                            <select
                                id="GrantsCertificateID"
                                className="w-full p-2 border rounded-md dark:bg-dark-input"
                                {...register('GrantsCertificateID', {
                                    setValueAs: (v) => v === '' ? undefined : Number(v)
                                })}
                                defaultValue=""
                            >
                                {/* Allow user to explicitly choose no competency */}
                                <option value="">None</option>
                                {competencies.map((c) => (
                                    <option key={c.competencyID} value={c.competencyID}>{c.competencyName}</option>
                                ))}
                            </select>
                        )}
                        {compLoading && <p className="text-xs text-custom-third dark:text-dark-secondary mt-1">Loading competencies…</p>}
                        {errors.GrantsCertificateID && <p className="text-red-500 text-xs mt-1">{errors.GrantsCertificateID.message}</p>}
                    </div>

                    <div className="flex items-center justify-end pt-4 space-x-3">
                        <Button type="button" onClick={onClose} disabled={isSubmitting} variant="outline">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting} variant="primary">
                            {isSubmitting ? 'Saving...' : 'Save Definition'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EventDefinitionFormModal;