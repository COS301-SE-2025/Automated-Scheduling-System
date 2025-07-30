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
    CustomEventDefinition: EventDefinition; // The nested definition object
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
    const response = await api<BackendScheduledEvent[]>('api/event-schedules');
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
            relevantParties: 'All', // Placeholder, adjust if you have this data
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
