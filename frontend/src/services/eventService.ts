import api from './api';
import type { EventInput } from '@fullcalendar/core';

// This type should align with the backend's EventResponse
export interface CalendarEvent extends EventInput {
    id: string;
    eventType?: string;
    relevantParties?: string;
}

export const getEvents = async (): Promise<CalendarEvent[]> => {
    const response = await api<CalendarEvent[]>('api/events', { method: 'GET' });
    return response.map((event: CalendarEvent) => ({
        ...event,
        start: event.start,
        end: event.end,
    }));
};

export const createEvent = async (eventData: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> => {
    const payload = {
        ...eventData,
        start: eventData.start ? new Date(eventData.start).toISOString() : undefined,
        end: eventData.end ? new Date(eventData.end).toISOString() : undefined,
    };
    const response = await api<CalendarEvent>('api/events', {
        method: 'POST',
        data: payload,
    });
    return response;
};

export const updateEvent = async (eventId: string, eventData: Partial<Omit<CalendarEvent, 'id'>>): Promise<CalendarEvent> => {
    const payload = {
        ...eventData,
        start: eventData.start ? new Date(eventData.start).toISOString() : undefined,
        end: eventData.end ? new Date(eventData.end).toISOString() : undefined,
    };
    const response = await api<CalendarEvent>(`api/events/${eventId}`, {
        method: 'PATCH',
        data: payload,
    });
    return response;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
    await api(`api/events/${eventId}`, { method: 'DELETE' });
};
