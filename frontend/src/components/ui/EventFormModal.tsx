import React, { useState, useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as eventService from '../../services/eventService';
import MessageBox from './MessageBox';
import { HexColorPicker } from 'react-colorful';
import { MultiSelect } from 'primereact/multiselect';
import Button from './Button';
import { useAuth } from '../../hooks/useAuth';
import { getAllUsers } from '../../services/userService';
import { getAllJobPositions, type JobPosition } from '../../services/jobPositionService';
import type { User } from '../../types/user';

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
    const [users, setUsers] = useState<User[]>([]);
    const [positions, setPositions] = useState<JobPosition[]>([]);
    const [attendance, setAttendance] = useState<Record<string, boolean>>({});
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);

    const { register, handleSubmit, reset, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<ScheduleFormData>({
        resolver: zodResolver(scheduleSchema),
        defaultValues: {
            color: '#3788d8', // Default color
            employeeNumbers: [],
            positionCodes: [],
        }
    });
    const watchPositions = watch('positionCodes');
    const filteredEmployees = useMemo(() => {
        return users;
    }, [users]);

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
                setPositions(p.filter(x => x.isActive));
            } catch (e) {
            }
        })();
        return () => { active = false; };
    }, [isOpen, isElevated]);

    const [employeesInPositions, setEmployeesInPositions] = useState<string[]>([]);
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

    useEffect(() => {
        if (!isOpen || !isEditMode || !isElevated || !initialData?.id) return;
        let active = true;
        (async () => {
            try {
                const rows = await eventService.getAttendance(Number(initialData.id));
                if (!active) return;
                const map: Record<string, boolean> = {};
                rows.forEach((r: any) => { map[r.employeeNumber ?? r.EmployeeNumber] = !!(r.attended ?? r.Attended); });
                setAttendance(map);
            } catch {  }
        })();
        return () => { active = false; };
    }, [isOpen, isEditMode, isElevated, initialData?.id]);

    const onSubmit = async (data: ScheduleFormData) => {
        setApiError(null);
        try {
            onSave({ id: initialData?.id, ...data });
        } catch (err) {
            console.error("Failed to save event schedule:", err);
            setApiError("An error occurred while saving. Please try again.");
        }
    };

    const grantedCompetencyId = useMemo(() => {
        const def = eventDefinitions.find((d) => d.CustomEventID === (initialData?.customEventId ?? 0));
        return def?.GrantsCertificateID ?? 0;
    }, [eventDefinitions, initialData?.customEventId]);

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
                        </div>

                        {/* Row 2: Employees + Positions */}
                        {isElevated && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Employees (optional)</label>
                                    <Controller
                                        name="employeeNumbers"
                                        control={control}
                                        render={({ field }) => {
                        const options = filteredEmployees.map(u => ({ label: `${u.name} (${u.employeeNumber})${(watchPositions?.length ?? 0) > 0 && employeesInPositions.includes(u.employeeNumber) ? ' • via position' : ''}`.trim(), value: u.employeeNumber, disabled: (watchPositions?.length ?? 0) > 0 && employeesInPositions.includes(u.employeeNumber) }));
                                            return (
                                                <MultiSelect
                                                    value={field.value || []}
                                                    onChange={(e) => field.onChange(e.value)}
                                                    options={options}
                                                    optionDisabled="disabled"
                                                    display="chip"
                                                    className="w-full"
                                                    placeholder={watchPositions && watchPositions.length > 0 ? "Employees (positions selected)" : "Select employees"}
                                                />
                                            );
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-custom-text dark:text-dark-text mb-1">Job Positions (optional)</label>
                                    <Controller
                                        name="positionCodes"
                                        control={control}
                                        render={({ field }) => (
                                            <MultiSelect
                                                value={field.value || []}
                                                onChange={(e) => field.onChange(e.value)}
                                                options={positions.map(p => ({ label: `${p.jobTitle} (${p.positionMatrixCode})`, value: p.positionMatrixCode }))}
                                                display="chip"
                                                className="w-full"
                                                placeholder="Select positions"
                                            />
                                        )}
                                    />
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

                        {/* Row 5: Min + Max */}
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

                        {/* Combined action row: Record Attendance (left) + Cancel/Save (right) to reduce vertical height */}
                        <div className="flex items-center justify-between pt-4">
                            <div>
                                {isElevated && isEditMode && (
                                    <Button type="button" className="px-4 py-2 text-sm font-medium text-white bg-custom-primary rounded-md shadow-sm hover:bg-custom-primary-hover" onClick={() => setShowAttendanceModal(true)}>
                                        Record Attendance
                                    </Button>
                                )}
                            </div>
                            <div className="flex items-center space-x-3">
                                <Button type="button" onClick={onClose} disabled={isSubmitting} variant="outline">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting} variant="primary">
                                    {isSubmitting ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Schedule Event')}
                                </Button>
                            </div>
                        </div>
                    </form>
                )}
                {/* Attendance modal rendered at root level to avoid nesting issues */}
                {isElevated && isEditMode && (
                    <AttendanceModal
                        isOpen={showAttendanceModal}
                        onClose={() => setShowAttendanceModal(false)}
                        employees={users}
                        selectedEmployees={initialData?.employeeNumbers ?? []}
                        attendance={attendance}
                        onChange={(next) => setAttendance(next)}
                        scheduleId={initialData?.id}
                        competencyId={grantedCompetencyId}
                    />
                )}
            </div>
        </div>
    );
};

export default EventFormModal;

// Separate Attendance Modal
const AttendanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    employees: User[];
    selectedEmployees: string[];
    attendance: Record<string, boolean>;
    onChange: (map: Record<string, boolean>) => void;
    scheduleId?: string;
    competencyId?: number;
}> = ({ isOpen, onClose, employees, selectedEmployees, attendance, onChange, scheduleId, competencyId }) => {
    if (!isOpen || !scheduleId) return null;
    const items = employees.filter(e => selectedEmployees.includes(e.employeeNumber));
    const toggle = (empNum: string) => onChange({ ...attendance, [empNum]: !attendance[empNum] });
    const save = async () => { await eventService.setAttendance(Number(scheduleId), { employeeNumbers: items.map(i => i.employeeNumber), attendance }); onClose(); };
    const [fulfilled, setFulfilled] = useState<Record<string, boolean>>({});
    useEffect(() => {
        let active = true;
        (async () => {
            if (!competencyId || competencyId <= 0 || items.length === 0) { setFulfilled({}); return; }
            try {
                const map = await eventService.checkEmployeesHaveCompetency(competencyId, items.map(i => i.employeeNumber));
                if (!active) return; setFulfilled(map);
            } catch { if (active) setFulfilled({}); }
        })();
        return () => { active = false; };
    }, [competencyId, isOpen, scheduleId, selectedEmployees.length]);
    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-600 bg-opacity-50 p-4">
            <div className="relative w-full max-w-md mx-auto bg-white dark:bg-dark-div rounded-lg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                    <h3 className="text-lg font-semibold">Record Attendance</h3>
                    <button type="button" onClick={onClose} className="p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
                <div className="p-4">
                    {items.length === 0 ? (
                        <p className="text-sm text-gray-600">No explicitly selected employees for this event.</p>
                    ) : (
                        <div className="grid grid-cols-1 gap-2 max-h-60 overflow-auto">
                            {items.map(e => (
                                <label key={e.id} className="flex items-center justify-between gap-2 text-sm">
                                    <span className="flex items-center gap-2">
                                        <input type="checkbox" checked={!!attendance[e.employeeNumber]} onChange={() => toggle(e.employeeNumber)} />
                                        <span>{e.name} ({e.employeeNumber})</span>
                                    </span>
                                    {fulfilled[e.employeeNumber] && (
                                        <span className="text-green-600 text-xs font-medium">Fulfilled</span>
                                    )}
                                </label>
                            ))}
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-3">Mark those who attended; when you set the event status to Completed and save, any competency linked to the event type will be granted to the marked attendees.</p>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t dark:border-gray-700">
                    <Button type="button" variant="outline" onClick={onClose}>Close</Button>
                    <Button type="button" variant="primary" onClick={save}>Save Attendance</Button>
                </div>
            </div>
        </div>
    );
};