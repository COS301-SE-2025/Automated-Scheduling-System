import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getEvents,
    getUserEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    type CalendarEvent,
} from '../../services/eventService';
import type { ApiError } from '../../types/api.types';

vi.mock('../../services/api');

const mockApi = vi.mocked(api);

describe('Event Service Integration Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Test data
    const mockEvents: CalendarEvent[] = [
        { id: '1', title: 'Team Meeting', start: '2025-06-27T10:00:00Z', end: '2025-06-27T11:00:00Z' },
        { id: '2', title: 'Project Deadline', start: '2025-06-28', allDay: true },
    ];

    const createMockError = (message: string, status: number): ApiError => {
        const error = new Error(message) as ApiError;
        error.status = status;
        return error;
    };

    // getEvents tests
    describe('getEvents', () => {
        it('should fetch all events successfully', async () => {
            mockApi.mockResolvedValue(mockEvents);

            const events = await getEvents();

            expect(mockApi).toHaveBeenCalledWith('api/events', { method: 'GET' });
            expect(events).toEqual(mockEvents);
        });

        it('should handle API errors when fetching events', async () => {
            const error = createMockError('Failed to fetch', 500);
            mockApi.mockRejectedValue(error);

            await expect(getEvents()).rejects.toThrow('Failed to fetch');
            expect(mockApi).toHaveBeenCalledWith('api/events', { method: 'GET' });
        });
    });

    // getUserEvents tests
    describe('getUserEvents', () => {
        it('should fetch user-specific events successfully', async () => {
            mockApi.mockResolvedValue(mockEvents);

            const events = await getUserEvents();

            expect(mockApi).toHaveBeenCalledWith('api/user-events', { method: 'GET' });
            expect(events).toEqual(mockEvents);
        });

        it('should handle API errors when fetching user events', async () => {
            const error = createMockError('Unauthorized', 401);
            mockApi.mockRejectedValue(error);

            await expect(getUserEvents()).rejects.toThrow('Unauthorized');
            expect(mockApi).toHaveBeenCalledWith('api/user-events', { method: 'GET' });
        });
    });

    // createEvent tests
    describe('createEvent', () => {
        it('should create a new event successfully', async () => {
            const newEventData = { title: 'New Event', start: new Date('2025-07-01T09:00:00Z') };
            const expectedPayload = {
                title: 'New Event',
                start: '2025-07-01T09:00:00.000Z',
                end: undefined,
            };
            const createdEvent: CalendarEvent = { id: '3', ...newEventData, start: expectedPayload.start };

            mockApi.mockResolvedValue(createdEvent);

            const result = await createEvent(newEventData);

            expect(mockApi).toHaveBeenCalledWith('api/events', {
                method: 'POST',
                data: expect.objectContaining(expectedPayload),
            });
            expect(result).toEqual(createdEvent);
        });

        it('should handle API errors when creating an event', async () => {
            const newEventData = { title: 'New Event', start: new Date() };
            const error = createMockError('Invalid data', 400);
            mockApi.mockRejectedValue(error);

            await expect(createEvent(newEventData)).rejects.toThrow('Invalid data');
        });
    });

    // updateEvent tests
    describe('updateEvent', () => {
        it('should update an event successfully', async () => {
            const eventId = '1';
            const updateData = { title: 'Updated Team Meeting' };
            const expectedPayload = { title: 'Updated Team Meeting', start: undefined, end: undefined };
            const updatedEvent: CalendarEvent = { ...mockEvents[0], ...updateData };

            mockApi.mockResolvedValue(updatedEvent);

            const result = await updateEvent(eventId, updateData);

            expect(mockApi).toHaveBeenCalledWith(`api/events/${eventId}`, {
                method: 'PATCH',
                data: expectedPayload,
            });
            expect(result).toEqual(updatedEvent);
        });

        it('should handle API errors when updating an event', async () => {
            const eventId = '999'; // If the event does not exist
            const updateData = { title: 'Ghost Event' };
            const error = createMockError('Event not found', 404);
            mockApi.mockRejectedValue(error);

            await expect(updateEvent(eventId, updateData)).rejects.toThrow('Event not found');
        });
    });

    // deleteEvent tests
    describe('deleteEvent', () => {
        it('should delete an event successfully', async () => {
            const eventId = '1';
            mockApi.mockResolvedValue(undefined); // Delete does not return any data

            await deleteEvent(eventId);

            expect(mockApi).toHaveBeenCalledWith(`api/events/${eventId}`, { method: 'DELETE' });
        });

        it('should handle API errors when deleting an event', async () => {
            const eventId = '999';
            const error = createMockError('Event not found', 404);
            mockApi.mockRejectedValue(error);

            await expect(deleteEvent(eventId)).rejects.toThrow('Event not found');
        });
    });
});