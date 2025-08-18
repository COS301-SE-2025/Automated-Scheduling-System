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
    return response.map(event => ({
        id: String(event.CustomEventScheduleID),
        title: event.Title,
        start: event.EventStartDate,
        end: event.EventEndDate,
        allDay: false,
        extendedProps: {
            scheduleId: event.CustomEventScheduleID,
            definitionId: event.CustomEventID,
            eventType: event.CustomEventDefinition.EventName,
            roomName: event.RoomName,
            maxAttendees: event.MaximumAttendees,
            minAttendees: event.MinimumAttendees,
            statusName: event.StatusName,
            creationDate: event.CreationDate,
            facilitator: event.CustomEventDefinition.Facilitator,
            relevantParties: buildRelevantParties(event),
            employees: (event.Employees || []).map((e: any) => e.employee_number ?? e.EmployeeNumber),
            positions: (event.Positions || []).map((p: any) => p.position_matrix_code ?? p.PositionMatrixCode),
            color: event.color,
        }
    }));
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
