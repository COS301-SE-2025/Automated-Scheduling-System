import api from './api';
import type { EventInput } from '@fullcalendar/core';

export interface EventDefinition {
    CustomEventID: number;
    EventName: string;
    ActivityDescription: string;
    StandardDuration: string;
    GrantsCertificateID?: number;
    Facilitator: string;
    CreatedBy: string;
    CreationDate: string; 
}

export type CreateEventDefinitionPayload = Omit<EventDefinition, 'CustomEventID' | 'CreatedBy' | 'CreationDate'>;

// This interface matches the full data structure sent by the backend for a scheduled event.
export interface BackendScheduledEvent {
    CustomEventScheduleID: number;
    CustomEventID: number;
    Title: string;
    EventStartDate: string;
    EventEndDate: string;
    RoomName?: string;
    MaximumAttendees?: number;
    MinimumAttendees?: number;
    StatusName: string;
    CreationDate: string;
    color: string;
    CustomEventDefinition: EventDefinition; // The nested definition object
    Employees?: { employee_number: string; role?: string }[];
    Positions?: { position_matrix_code: string }[];
    canEdit?: boolean;
    canDelete?: boolean;
    creatorUserId?: number;
}

export interface CalendarEvent extends EventInput {
    id: string; 
    extendedProps: {
        scheduleId: number;
        definitionId: number;
        eventType: string;
        roomName?: string;
        maxAttendees?: number;
        minAttendees?: number;
        statusName: string;
        creationDate: string;
        facilitator?: string;
    relevantParties?: string; // Added for consistency
    employees?: string[]; // employee numbers linked to this schedule
    positions?: string[]; // position codes targeted by this schedule
        color: string;
    canEdit?: boolean;
    canDelete?: boolean;
    creatorUserId?: number;
    // Client-only props for multi-day visualization
    seriesStart?: string;
    seriesEnd?: string;
    seriesId?: string;
    instanceDate?: string; // YYYY-MM-DD
    };
}

export interface CreateSchedulePayload {
    customEventId: number;
    title: string;
    start: string; 
    end: string;   
    roomName?: string;
    maxAttendees?: number;
    minAttendees?: number;
    statusName?: string;
    color?: string;
    employeeNumbers?: string[];
    positionCodes?: string[];
}

// --- Event Definition API Calls ---
export const getEventDefinitions = async (): Promise<EventDefinition[]> => {
    return api<EventDefinition[]>('event-definitions', { method: 'GET' });
};

export const createEventDefinition = async (definitionData: CreateEventDefinitionPayload): Promise<EventDefinition> => {
    return api<EventDefinition>('event-definitions', {
        method: 'POST',
        data: definitionData,
    });
};

export const updateEventDefinition = async (definitionId: number, definitionData: Partial<CreateEventDefinitionPayload>): Promise<EventDefinition> => {
    return api<EventDefinition>(`event-definitions/${definitionId}`, {
        method: 'PUT',
        data: definitionData,
    });
};

export const deleteEventDefinition = async (definitionId: number): Promise<void> => {
    await api(`event-definitions/${definitionId}`, { method: 'DELETE' });
};


// --- Event Schedule API Calls (for the calendar) ---
export const getScheduledEvents = async (): Promise<CalendarEvent[]> => {
    const response = await api<BackendScheduledEvent[]>('event-schedules');

    // Robust boolean coercion to avoid truthy string values like 'false'
    const toBool = (v: any): boolean => v === true || v === 1 || v === '1' || String(v).toLowerCase() === 'true';

    return response.map(raw => {
        const canEdit = toBool((raw as any).canEdit ?? (raw as any).CanEdit);
        const canDelete = toBool((raw as any).canDelete ?? (raw as any).CanDelete);
        return {
            id: String(raw.CustomEventScheduleID),
            title: raw.Title,
            start: raw.EventStartDate,
            end: raw.EventEndDate,
            allDay: false,
            editable: canEdit,
            // Per-event editability hints for FullCalendar (in addition to eventAllow guards)
            startEditable: canEdit,
            durationEditable: canEdit,
            extendedProps: {
                scheduleId: raw.CustomEventScheduleID,
                definitionId: raw.CustomEventID,
                eventType: raw.CustomEventDefinition.EventName,
                roomName: raw.RoomName,
                maxAttendees: raw.MaximumAttendees,
                minAttendees: raw.MinimumAttendees,
                statusName: raw.StatusName,
                creationDate: raw.CreationDate,
                facilitator: raw.CustomEventDefinition.Facilitator,
                relevantParties: buildRelevantParties(raw),
                employees: (raw.Employees || []).map((e: any) => e.employee_number ?? e.EmployeeNumber),
                positions: (raw.Positions || []).map((p: any) => p.position_matrix_code ?? p.PositionMatrixCode),
                color: raw.color,
                canEdit,
                canDelete,
                creatorUserId: (raw as any).creatorUserId ?? (raw as any).CreatorID,
            }
        } as CalendarEvent;
    });
};

const buildRelevantParties = (event: BackendScheduledEvent): string => {
    const empCount = event.Employees?.length ?? 0;
    const posCount = event.Positions?.length ?? 0;
    if (empCount === 0 && posCount === 0) return 'Unassigned';
    const parts: string[] = [];
    if (empCount > 0) parts.push(`${empCount} employee${empCount > 1 ? 's' : ''}`);
    if (posCount > 0) parts.push(`${posCount} position${posCount > 1 ? 's' : ''}`);
    return parts.join(', ');
}

export const createScheduledEvent = async (scheduleData: CreateSchedulePayload): Promise<any> => {
    return api('event-schedules', {
        method: 'POST',
        data: scheduleData,
    });
};

export const updateScheduledEvent = async (scheduleId: number, scheduleData: Partial<CreateSchedulePayload>): Promise<any> => {
    return api(`event-schedules/${scheduleId}`, {
        method: 'PUT',
        data: scheduleData,
    });
};

export const deleteScheduledEvent = async (scheduleId: number): Promise<void> => {
    await api(`event-schedules/${scheduleId}`, { method: 'DELETE' });
};

// --- Attendance ---
export interface AttendanceRow { id?: number; employeeNumber: string; attended: boolean; checkInTime?: string; }
export const getAttendance = async (scheduleId: number): Promise<AttendanceRow[]> => {
    return api<AttendanceRow[]>(`event-schedules/${scheduleId}/attendance`, { method: 'GET' });
};

export const setAttendance = async (scheduleId: number, data: { employeeNumbers?: string[]; attendance?: Record<string, boolean>; }): Promise<void> => {
    await api(`event-schedules/${scheduleId}/attendance`, { method: 'POST', data });
};

// Returns explicit employees linked to the schedule, plus those currently in targeted positions
export interface AttendanceCandidate { employeeNumber: string; name: string; }
export const getAttendanceCandidates = async (scheduleId: number): Promise<AttendanceCandidate[]> => {
    return api<AttendanceCandidate[]>(`event-schedules/${scheduleId}/attendance-candidates`, { method: 'GET' });
};

// --- Utilities for UI ---
export const getEmployeesByPositions = async (codes: string[]): Promise<string[]> => {
    if (!codes || codes.length === 0) return [];
    const q = encodeURIComponent(codes.join(','));
    return api<string[]>(`employees-by-positions?codes=${q}`, { method: 'GET' });
};

export const checkEmployeesHaveCompetency = async (competencyId: number, employeeNumbers: string[]): Promise<Record<string, boolean>> => {
    const res = await api<{ result: Record<string, boolean> }>(`competency-check`, { method: 'POST', data: { competencyId, employeeNumbers } });
    return res.result || {};
};
