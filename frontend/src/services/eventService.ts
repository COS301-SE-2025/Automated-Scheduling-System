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
export interface ScheduledEventResponse {
    id: number;
    title: string;
    start: string; 
    end: string;   
    roomName?: string;
    facilitator?: string;
    status?: string;
    allDay: boolean;
    // Add new properties from backend
    eventType?: string;
    relevantParties?: string;
}

export interface CalendarEvent extends EventInput {
    id: string; 
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    extendedProps: {
        roomName?: string;
        facilitator?: string;
        status?: string;
        // Add new properties
        eventType?: string;
        relevantParties?: string;
    };
}

export interface CreateSchedulePayload {
    customEventId: number;
    start: string; 
    end: string;   
    roomName?: string;
    maxAttendees?: number;
    minAttendees?: number;
    statusName?: string;
}

// --- Event Definition API Calls ---
export const getEventDefinitions = async (): Promise<EventDefinition[]> => {
    return api<EventDefinition[]>('api/event-definitions', { method: 'GET' });
};

export const createEventDefinition = async (definitionData: CreateEventDefinitionPayload): Promise<EventDefinition> => {
    return api<EventDefinition>('api/event-definitions', {
        method: 'POST',
        data: definitionData,
    });
};

export const updateEventDefinition = async (definitionId: number, definitionData: Partial<CreateEventDefinitionPayload>): Promise<EventDefinition> => {
    return api<EventDefinition>(`api/event-definitions/${definitionId}`, {
        method: 'PUT',
        data: definitionData,
    });
};

export const deleteEventDefinition = async (definitionId: number): Promise<void> => {
    await api(`api/event-definitions/${definitionId}`, { method: 'DELETE' });
};


// --- Event Schedule API Calls (for the calendar) ---
export const getScheduledEvents = async (): Promise<CalendarEvent[]> => {
    const response = await api<ScheduledEventResponse[]>('api/event-schedules', { method: 'GET' });
    return response.map((event: ScheduledEventResponse) => ({
        id: String(event.id),
        title: event.title,
        start: event.start,
        end: event.end,
        allDay: event.allDay,
        extendedProps: {
            roomName: event.roomName,
            facilitator: event.facilitator,
            status: event.status,
            eventType: event.eventType,
            relevantParties: event.relevantParties,
        }
    }));
};

export const createScheduledEvent = async (scheduleData: CreateSchedulePayload): Promise<any> => {
    return api('api/event-schedules', {
        method: 'POST',
        data: scheduleData,
    });
};

export const updateScheduledEvent = async (scheduleId: number, scheduleData: Partial<CreateSchedulePayload>): Promise<any> => {
    return api(`api/event-schedules/${scheduleId}`, {
        method: 'PUT',
        data: scheduleData,
    });
};

export const deleteScheduledEvent = async (scheduleId: number): Promise<void> => {
    await api(`api/event-schedules/${scheduleId}`, { method: 'DELETE' });
};
