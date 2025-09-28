import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as eventService from '../../services/eventService';
import MessageBox from './MessageBox';
import { HexColorPicker } from 'react-colorful';
// Removed MultiSelect combo boxes in favor of modal-based selection
import Button from './Button';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers } from '../../services/userService';
import { getAllJobPositions, type JobPosition } from '../../services/jobPositionService';
import { getAllJobRequirements } from '../../services/jobRequirementService';
import type { User } from '../../types/user';
import EventEmployeeFilterModal from './EventEmployeeFilterModal';
import GenericSelectModal from './GenericSelectModal';

const scheduleSchema = z.object({
    title: z.string().min(1, "Title is required."),
    customEventId: z.number({ required_error: "You must select an event type." }).min(1, "You must select an event type."),
    start: z.string().min(1, "Start date is required."),
    end: z.string().min(1, "End date is required."),
    roomName: z.string().optional(),
    maximumAttendees: z.number().min(0, "Maximum attendees must be 0 or greater").optional().nullable(),
    minimumAttendees: z.number().min(0, "Minimum attendees must be 0 or greater").optional().nullable(),
    statusName: z.string().optional(),
    color: z.string().optional(),
    employeeNumbers: z.array(z.string()).optional(),
    positionCodes: z.array(z.string()).optional(),
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
    employeeNumbers?: string[];
    positionCodes?: string[];
    };
    eventDefinitions: eventService.EventDefinition[];
    onNeedDefinition: () => void;
}

const EventFormModal: React.FC<EventFormModalProps> = ({ isOpen, onClose, onSave, initialData, eventDefinitions, onNeedDefinition }) => {
    const [apiError, setApiError] = useState<string | null>(null);
    const isEditMode = !!initialData?.id;
    const [showColorPicker, setShowColorPicker] = useState(false);
    const auth = useAuth();
    const isElevated = auth.permissions?.includes('events') && (auth.user?.role === 'Admin' || auth.user?.role === 'HR');
    // Additional per-event permission (for edit): rely on initialData id mapping to selected event's extendedProps.canEdit if available via window state.
    // If not editing, default to true for elevated roles.
    const canEditEvent = isEditMode ? true : true; // placeholder - backend gating prevents unauthorized updates.
    const [users, setUsers] = useState<User[]>([]);
    const [positions, setPositions] = useState<JobPosition[]>([]);
    const [allPositions, setAllPositions] = useState<JobPosition[]>([]);
    const [employeesInPositions, setEmployeesInPositions] = useState<string[]>([]);
    // Removed legacy attendance state and modal
    // const [attendance, setAttendance] = useState<Record<string, boolean>>({});
    // const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            color: '#3788d8',
            employeeNumbers: [],
            positionCodes: [],
        }
    });
    const watchPositions = watch('positionCodes');
    const watchCustomEventId = watch('customEventId');
    // Selector modal visibility
    const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
    const [showPositionSelector, setShowPositionSelector] = useState(false);
    const [showEventTypePicker, setShowEventTypePicker] = useState(false);

    const showNoDefinitionsMessage = isOpen && !isEditMode && eventDefinitions.length === 0;

    useEffect(() => {
        if (isOpen && !showNoDefinitionsMessage) {
            if (isEditMode && initialData) {
                // Convert ISO string to local datetime format for datetime-local inputs
                const toLocalISOString = (dateStr: string) => {
                    const d = new Date(dateStr);
                    const tzoffset = d.getTimezoneOffset() * 60000;
                    const localISOTime = new Date(d.getTime() - tzoffset).toISOString().slice(0, 16);
                    return localISOTime;
                };
                
                // In edit mode, populate with existing data
                reset({
                    title: initialData.title || '',
                    customEventId: initialData.customEventId,
                    start: toLocalISOString(initialData.startStr),
                    end: toLocalISOString(initialData.endStr),
                    roomName: initialData.roomName || '',
                    maximumAttendees: initialData.maximumAttendees || 0,
                    minimumAttendees: initialData.minimumAttendees || 0,
                    statusName: initialData.statusName || 'Scheduled',
                    color: initialData.color || '#3788d8',
                    employeeNumbers: initialData.employeeNumbers || [],
                    positionCodes: initialData.positionCodes || [],
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
                    employeeNumbers: [],
                    positionCodes: [],
                });
            }
            setApiError(null);
        }
    }, [isOpen, showNoDefinitionsMessage, initialData, isEditMode, reset]);

    useEffect(() => {
        if (!isOpen || !isElevated) return;
        let active = true;
        (async () => {
            try {
                const [u, p] = await Promise.all([
                    getAllUsers(),
                    getAllJobPositions(),
                ]);
                if (!active) return;
                setUsers(u);
                setAllPositions(p.filter(x => x.isActive));
            } catch (e) {
                console.log('Failed to load users and positions:', e);
            }
        })();
        return () => { active = false; };
    }, [isOpen, isElevated]);

    useEffect(() => {
        if (!isOpen || !isElevated) return;
        let cancelled = false;
        (async () => {
            const activePositions = allPositions; 
            const competencyId = ((): number => {
                const def = eventDefinitions.find(d => d.CustomEventID === (watchCustomEventId ?? initialData?.customEventId ?? 0));
                return def?.GrantsCertificateID ?? 0;
            })();

            if (competencyId && competencyId > 0) {
                try {
                    const requirements = await getAllJobRequirements({ competencyId });
                    const allowedCodes = new Set(requirements.map(r => r.positionMatrixCode));
                    const allowedPositions = activePositions.filter(p => allowedCodes.has(p.positionMatrixCode));
                    if (cancelled) return;
                    setPositions(allowedPositions);
                    const current = watch('positionCodes') || [];
                    const allowedSet = new Set(allowedPositions.map(p => p.positionMatrixCode));
                    const filtered = current.filter(code => allowedSet.has(code));
                    if (filtered.length !== current.length) {
                        setValue('positionCodes', filtered, { shouldDirty: true, shouldValidate: true });
                    }
                } catch {
                    if (!cancelled) setPositions(activePositions);
                }
            } else {
                if (!cancelled) setPositions(activePositions);
            }
        })();
        return () => { cancelled = true; };
    }, [isOpen, isElevated, allPositions, watchCustomEventId, eventDefinitions, initialData?.customEventId]);

    useEffect(() => {
        if (!isOpen) return;
        let active = true;
        (async () => {
            const pos = watchPositions || [];
            if (pos.length === 0) { setEmployeesInPositions([]); return; }
            try {
                const empNums = await eventService.getEmployeesByPositions(pos);
                if (!active) return;
                setEmployeesInPositions(empNums);
            } catch { setEmployeesInPositions([]); }
        })();
        return () => { active = false; };
    }, [isOpen, watchPositions]);

    useEffect(() => {
        if (!isOpen) return;
        const selected = watch('employeeNumbers') || [];
        if (employeesInPositions.length > 0) {
            const filtered = selected.filter(e => !employeesInPositions.includes(e));
            if (filtered.length !== selected.length) {
                setValue('employeeNumbers', filtered, { shouldDirty: true, shouldValidate: true });
            }
        }
    }, [isOpen, employeesInPositions, setValue, watch]);

    const onSubmit = async (data: ScheduleFormData) => {
        setApiError(null);
        try {
            onSave({ id: initialData?.id, ...data });
        } catch (err) {
            console.error("Failed to save event schedule:", err);
            setApiError("An error occurred while saving. Please try again.");
        }
    };

    // const grantedCompetencyId = useMemo(() => {
    //     const selectedId = watchCustomEventId ?? initialData?.customEventId ?? 0;
    //     const def = eventDefinitions.find((d) => d.CustomEventID === selectedId);
    //     return def?.GrantsCertificateID ?? 0;
    // }, [eventDefinitions, watchCustomEventId, initialData?.customEventId]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-3xl mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
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
                        
                        {/* Row 1: Title + Event Type */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="title" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Title</label>
                                <input id="title" {...register('title')} className="w-full p-2 border rounded-md dark:bg-dark-input" placeholder="e.g., Q3 All-Hands Meeting" />
                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Type</label>
                                <div className="flex items-center gap-2">
                                    <Button type="button" variant="outline" onClick={() => setShowEventTypePicker(true)}>Select Event Type</Button>
                                    <span className="text-sm text-gray-600 dark:text-gray-300">
                                        {(() => { const id = watchCustomEventId ?? initialData?.customEventId; const d = eventDefinitions.find(x => x.CustomEventID === id); return d ? d.EventName : 'None selected'; })()}
                                    </span>
                                    {(watchCustomEventId || initialData?.customEventId) && (
                                        <button type="button" className="text-gray-400 hover:text-red-600" title="Clear selection" onClick={() => setValue('customEventId', undefined as any, { shouldDirty: true, shouldValidate: true })}>×</button>
                                    )}
                                </div>
                                {/* register the field invisibly so validation works */}
                                <input type="hidden" {...register('customEventId', { valueAsNumber: true })} />
                                {errors.customEventId && <p className="text-red-500 text-xs mt-1">{errors.customEventId.message}</p>}
                            </div>
                        </div>

                        {/* Row 2: Employees + Positions (modal-based selection) */}
                        {isElevated && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Employees (optional)</label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" onClick={() => setShowEmployeeSelector(true)}>Select Employees</Button>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setShowEmployeeSelector(true)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setShowEmployeeSelector(true); }}
                                            className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:underline"
                                        >
                                            {(watch('employeeNumbers')?.length || 0) > 0
                                                ? `${watch('employeeNumbers')!.length} employee${watch('employeeNumbers')!.length === 1 ? '' : 's'} selected`
                                                : 'No employees selected'}
                                        </span>
                                        {(watch('employeeNumbers')?.length || 0) > 0 && (
                                            <button
                                                type="button"
                                                aria-label="Clear employee selections"
                                                title="Clear selections"
                                                onClick={() => setValue('employeeNumbers', [], { shouldDirty: true, shouldValidate: true })}
                                                className="ml-1 text-gray-400 hover:text-red-600"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                    {watchPositions && watchPositions.length > 0 && (
                                        <p className="text-xs text-gray-500 mt-1">Employees covered by selected positions are automatically included.</p>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Job Positions (optional)</label>
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="outline" onClick={() => setShowPositionSelector(true)}>Select by Job Position</Button>
                                        <span
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setShowPositionSelector(true)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') setShowPositionSelector(true); }}
                                            className="text-sm text-gray-600 dark:text-gray-300 cursor-pointer hover:underline"
                                        >
                                            {(watch('positionCodes')?.length || 0) > 0
                                                ? `${watch('positionCodes')!.length} position${watch('positionCodes')!.length === 1 ? '' : 's'} selected`
                                                : 'No positions selected'}
                                        </span>
                                        {(watch('positionCodes')?.length || 0) > 0 && (
                                            <button
                                                type="button"
                                                aria-label="Clear position selections"
                                                title="Clear selections"
                                                onClick={() => setValue('positionCodes', [], { shouldDirty: true, shouldValidate: true })}
                                                className="ml-1 text-gray-400 hover:text-red-600"
                                            >
                                                ×
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Row 3: Start + End */}
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

                        {/* Row 4: Location + Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="roomName" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Location</label>
                                <input id="roomName" {...register('roomName')} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                            </div>
                            <div>
                                <label htmlFor="statusName" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Status</label>
                                <Controller
                                    name="statusName"
                                    control={control}
                                    render={({ field }) => (
                                        <select id="statusName" {...field} className="w-full p-2 border rounded-md dark:bg-dark-input" disabled={!isElevated}>
                                            <option value="Scheduled">Scheduled</option>
                                            <option value="Confirmed">Confirmed</option>
                                            <option value="Completed">Completed</option>
                                            <option value="Cancelled">Cancelled</option>
                                        </select>
                                    )}
                                />
                                <p className="text-xs text-gray-500 mt-1">Set to Completed and save to grant any linked competency to marked attendees.</p>
                            </div>
                        </div>
                        
                        {/* Remove negative values being input into the min attendees spn edit */}
                        {/* Row 5: Min + Max */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="minimumAttendees" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Min Attendees (Optional)</label>
                                <input id="minimumAttendees" type="number" min={0} step={1} {...register('minimumAttendees', { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                                {errors.minimumAttendees && <p className="text-red-500 text-xs mt-1">{errors.minimumAttendees.message}</p>}
                            </div>
                            <div>
                                <label htmlFor="maximumAttendees" className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Max Attendees (Optional)</label>
                                <input id="maximumAttendees" type="number" min={0} step={1} {...register('maximumAttendees', { valueAsNumber: true })} className="w-full p-2 border rounded-md dark:bg-dark-input" />
                                {errors.maximumAttendees && <p className="text-red-500 text-xs mt-1">{errors.maximumAttendees.message}</p>}
                            </div>
                        </div>


                        <div>
                            <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Event Color</label>
                            <Controller
                                name="color"
                                control={control}
                                render={({ field }) => (
                                    <div className="relative">
                                        <button
                                            type="button"
                                            aria-label="Choose event color"
                                            onClick={() => setShowColorPicker(true)}
                                            className="w-8 h-8 rounded border shadow-inner"
                                            title="Click to choose color"
                                            style={{ backgroundColor: field.value || '#3788d8' }}
                                        />

                                        {showColorPicker && (
                                            <div
                                                className="fixed inset-0 flex items-center justify-center bg-black/30"
                                                style={{ zIndex: 60 }}
                                                onClick={() => setShowColorPicker(false)}
                                            >
                                                <div
                                                    className="bg-white dark:bg-dark-div p-4 rounded-lg shadow-xl"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <div className="flex items-center justify-between mb-3">
                                                        <h4 className="font-medium text-custom-text dark:text-dark-text">
                                                            Select Event Color
                                                        </h4>
                                                        <button
                                                            type="button"
                                                            aria-label="Close color picker"
                                                            onClick={() => setShowColorPicker(false)}
                                                            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                                                        >
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <HexColorPicker
                                                        color={field.value || '#3788d8'}
                                                        onChange={field.onChange}
                                                        style={{ width: 200, height: 200 }}
                                                    />
                                                    <div className="mt-3 flex justify-end">
                                                        <Button type="button" onClick={() => setShowColorPicker(false)} variant="primary">
                                                            Done
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            />
                        </div>

                        {/* Combined action row: remove legacy "Record Attendance" button */}
                        <div className="flex items-center justify-between pt-4">
                            <div>{/* (legacy Record Attendance removed) */}</div>
                            <div className="flex items-center space-x-3">
                                <Button type="button" onClick={onClose} disabled={isSubmitting} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting || (isEditMode && !canEditEvent)} variant="primary">
                                    {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Schedule Event')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
                {/* Selection modals */}
                {isElevated && (
                    <>
                        <EventEmployeeFilterModal
                            isOpen={showEmployeeSelector}
                            mode="employees"
                            users={users}
                            disabledIds={employeesInPositions}
                            initialSelected={watch('employeeNumbers') || []}
                            onClose={() => setShowEmployeeSelector(false)}
                            onConfirm={(ids) => { setValue('employeeNumbers', ids, { shouldDirty: true, shouldValidate: true }); setShowEmployeeSelector(false); }}
                        />
                        <EventEmployeeFilterModal
                            isOpen={showPositionSelector}
                            mode="positions"
                            positions={positions}
                            initialSelected={watch('positionCodes') || []}
                            onClose={() => setShowPositionSelector(false)}
                            onConfirm={(ids) => { setValue('positionCodes', ids, { shouldDirty: true, shouldValidate: true }); setShowPositionSelector(false); }}
                        />
                    </>
                )}
                <GenericSelectModal<eventService.EventDefinition>
                    isOpen={showEventTypePicker}
                    title="Select event type"
                    items={eventDefinitions}
                    idKey={(d) => String(d.CustomEventID)}
                    columns={[ { header: 'Name', field: 'EventName' }, { header: 'Duration', field: 'StandardDuration', className: 'text-gray-500' } ]}
                    searchFields={[ 'EventName' ] as any}
                    multiSelect={false}
                    onClose={() => setShowEventTypePicker(false)}
                    onConfirm={(ids) => { const val = ids[0] ? Number(ids[0]) : undefined; setValue('customEventId', val as any, { shouldDirty: true, shouldValidate: true }); setShowEventTypePicker(false); }}
                    footerPrimaryLabel="Use Selection"
                />
            </div>
        </div>
    );
};

export default EventFormModal;