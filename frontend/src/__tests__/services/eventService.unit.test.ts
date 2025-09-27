import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getScheduledEvents,
    createScheduledEvent,
    updateScheduledEvent,
    deleteScheduledEvent,
    type CalendarEvent,
    type BackendScheduledEvent,
    type CreateSchedulePayload,
    type EventDefinition,
} from '../../services/eventService';
import type { ApiError } from '../../types/api.types';

// Mock the api module
vi.mock('../../services/api');
const mockApi = vi.mocked(api);

describe('Event Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const createMockError = (message: string, status: number): ApiError => {
        const error = new Error(message) as ApiError;
        error.status = status;
        return error;
    };

    // --- Tests for Event Schedule API Calls ---
    describe('Scheduled Event API Calls', () => {
        const mockBackendEvents: BackendScheduledEvent[] = [
            {
                CustomEventScheduleID: 1,
                CustomEventID: 101,
                Title: 'Team Meeting',
                EventStartDate: '2025-06-27T10:00:00Z',
                EventEndDate: '2025-06-27T11:00:00Z',
                StatusName: 'Scheduled',
                CreationDate: '2025-06-20T10:00:00Z',
                color: '#3788d8',
                CustomEventDefinition: {
                    CustomEventID: 101,
                    EventName: 'Standard Meeting',
                    Facilitator: 'Admin',
                } as EventDefinition,
            },
            {
                CustomEventScheduleID: 2,
                CustomEventID: 102,
                Title: 'Project Review',
                EventStartDate: '2025-06-28T14:00:00Z',
                EventEndDate: '2025-06-28T15:30:00Z',
                StatusName: 'Confirmed',
                CreationDate: '2025-06-21T10:00:00Z',
                color: '#ff9f89',
                CustomEventDefinition: {
                    CustomEventID: 102,
                    EventName: 'Project Milestone',
                    Facilitator: 'Lead Dev',
                } as EventDefinition,
            },
        ];

    const expectedCalendarEvents: CalendarEvent[] = [
            {
                id: '1',
                title: 'Team Meeting',
                start: '2025-06-27T10:00:00Z',
                end: '2025-06-27T11:00:00Z',
                allDay: false,
                editable: false,
                startEditable: false,
                durationEditable: false,
                extendedProps: {
                    scheduleId: 1,
                    definitionId: 101,
                    eventType: 'Standard Meeting',
                    roomName: undefined,
                    maxAttendees: undefined,
                    minAttendees: undefined,
                    statusName: 'Scheduled',
                    creationDate: '2025-06-20T10:00:00Z',
                    facilitator: 'Admin',
            relevantParties: 'Unassigned',
            employees: [],
            positions: [],
                    canEdit: false,
                    canDelete: false,
                    creatorUserId: undefined,
                    color: '#3788d8',
                },
            },
            {
                id: '2',
                title: 'Project Review',
                start: '2025-06-28T14:00:00Z',
                end: '2025-06-28T15:30:00Z',
                allDay: false,
                editable: false,
                startEditable: false,
                durationEditable: false,
                extendedProps: {
                    scheduleId: 2,
                    definitionId: 102,
                    eventType: 'Project Milestone',
                    roomName: undefined,
                    maxAttendees: undefined,
                    minAttendees: undefined,
                    statusName: 'Confirmed',
                    creationDate: '2025-06-21T10:00:00Z',
                    facilitator: 'Lead Dev',
            relevantParties: 'Unassigned',
            employees: [],
            positions: [],
                    canEdit: false,
                    canDelete: false,
                    creatorUserId: undefined,
                    color: '#ff9f89',
                },
            },
        ];

        describe('getScheduledEvents', () => {
            it('should fetch and map scheduled events successfully', async () => {
                mockApi.mockResolvedValue(mockBackendEvents);

                const events = await getScheduledEvents();

                expect(mockApi).toHaveBeenCalledWith('event-schedules');
                expect(events).toEqual(expectedCalendarEvents);
            });

            it('should handle API errors when fetching scheduled events', async () => {
                const error = createMockError('Failed to fetch', 500);
                mockApi.mockRejectedValue(error);

                await expect(getScheduledEvents()).rejects.toThrow('Failed to fetch');
                expect(mockApi).toHaveBeenCalledWith('event-schedules');
            });
        });

        describe('createScheduledEvent', () => {
            it('should create a new scheduled event successfully', async () => {
                const newSchedulePayload: CreateSchedulePayload = {
                    customEventId: 103,
                    title: 'New Workshop',
                    start: '2025-07-01T09:00:00.000Z',
                    end: '2025-07-01T11:00:00.000Z',
                    color: '#00ff00',
                };
                const createdEventResponse = { ...newSchedulePayload, CustomEventScheduleID: 3 }; // Mock response
                
                mockApi.mockResolvedValue(createdEventResponse);

                const result = await createScheduledEvent(newSchedulePayload);

                expect(mockApi).toHaveBeenCalledWith('event-schedules', {
                    method: 'POST',
                    data: newSchedulePayload,
                });
                expect(result).toEqual(createdEventResponse);
            });

            it('should handle API errors when creating a scheduled event', async () => {
                const newSchedulePayload: CreateSchedulePayload = { customEventId: 1, title: 'Test', start: '', end: '' };
                const error = createMockError('Invalid data', 400);
                mockApi.mockRejectedValue(error);

                await expect(createScheduledEvent(newSchedulePayload)).rejects.toThrow('Invalid data');
            });
        });

        describe('updateScheduledEvent', () => {
            it('should update a scheduled event successfully', async () => {
                const scheduleId = 1;
                const updatePayload: Partial<CreateSchedulePayload> = { title: 'Updated Team Meeting' };
                const updatedEventResponse = { ...mockBackendEvents[0], Title: 'Updated Team Meeting' };

                mockApi.mockResolvedValue(updatedEventResponse);

                const result = await updateScheduledEvent(scheduleId, updatePayload);

                expect(mockApi).toHaveBeenCalledWith(`event-schedules/${scheduleId}`, {
                    method: 'PUT',
                    data: updatePayload,
                });
                expect(result).toEqual(updatedEventResponse);
            });

            it('should handle API errors when updating a scheduled event', async () => {
                const scheduleId = 999;
                const updatePayload = { title: 'Ghost Event' };
                const error = createMockError('Event not found', 404);
                mockApi.mockRejectedValue(error);

                await expect(updateScheduledEvent(scheduleId, updatePayload)).rejects.toThrow('Event not found');
            });
        });

        describe('deleteScheduledEvent', () => {
            it('should delete a scheduled event successfully', async () => {
                const scheduleId = 1;
                mockApi.mockResolvedValue(undefined);

                await deleteScheduledEvent(scheduleId);

                expect(mockApi).toHaveBeenCalledWith(`event-schedules/${scheduleId}`, { method: 'DELETE' });
            });

            it('should handle API errors when deleting a scheduled event', async () => {
                const scheduleId = 999;
                const error = createMockError('Event not found', 404);
                mockApi.mockRejectedValue(error);

                await expect(deleteScheduledEvent(scheduleId)).rejects.toThrow('Event not found');
            });
        });
    });
});