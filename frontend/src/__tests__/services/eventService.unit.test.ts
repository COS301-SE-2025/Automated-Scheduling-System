import { describe, it, expect, vi, beforeEach } from 'vitest';
import api from '../../services/api';
import {
    getScheduledEvents,
    createScheduledEvent,
    updateScheduledEvent,
    deleteScheduledEvent,
    // NEW exports:
    rsvpScheduledEvent,
    getAttendance,
    setAttendance,
    getBookedEmployees,
    getAttendanceCandidates,
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
                // Explicitly empty to verify relevantParties fallback and arrays mapping
                Employees: [],
                Positions: [],
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
                Employees: [],
                Positions: [],
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
                    hasGrantedCompetencies: false,
                    creatorUserId: undefined,
                    color: '#3788d8',
                    // new booking-related props default/falsy
                    myBooking: undefined,
                    bookedCount: undefined,
                    spotsLeft: undefined,
                    canRSVP: false,
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
                    hasGrantedCompetencies: false,
                    creatorUserId: undefined,
                    color: '#ff9f89',
                    myBooking: undefined,
                    bookedCount: undefined,
                    spotsLeft: undefined,
                    canRSVP: false,
                },
            },
        ];

        describe('getScheduledEvents', () => {
            it('maps scheduled events with defaults (including canRSVP=false)', async () => {
                mockApi.mockResolvedValue(mockBackendEvents);

                const events = await getScheduledEvents();

                expect(mockApi).toHaveBeenCalledWith('event-schedules');
                expect(events).toEqual(expectedCalendarEvents);
            });

            it('maps booking helpers and canRSVP when provided by backend', async () => {
                const enriched: BackendScheduledEvent[] = [
                    {
                        CustomEventScheduleID: 10,
                        CustomEventID: 500,
                        Title: 'Safety Training',
                        EventStartDate: '2025-08-01T09:00:00Z',
                        EventEndDate: '2025-08-01T11:00:00Z',
                        StatusName: 'Scheduled',
                        CreationDate: '2025-07-20T10:00:00Z',
                        color: '#00aa00',
                        CustomEventDefinition: {
                            CustomEventID: 500,
                            EventName: 'Safety',
                            Facilitator: 'HR',
                        } as EventDefinition,
                        Employees: [{ employee_number: 'E123', role: 'Booked' }],
                        Positions: [{ position_matrix_code: 'P-OPS' }],
                        // booking helpers
                        bookedCount: 1,
                        spotsLeft: 9,
                        myBooking: 'Booked' as any,
                        canRSVP: true as any,
                        canEdit: true as any,
                        canDelete: true as any,
                    },
                ];
                mockApi.mockResolvedValue(enriched);

                const events = await getScheduledEvents();

                expect(events).toHaveLength(1);
                const ev = events[0];
                expect(ev.extendedProps.employees).toEqual(['E123']);
                expect(ev.extendedProps.positions).toEqual(['P-OPS']);
                expect(ev.extendedProps.myBooking).toBe('Booked');
                expect(ev.extendedProps.bookedCount).toBe(1);
                expect(ev.extendedProps.spotsLeft).toBe(9);
                expect(ev.extendedProps.canRSVP).toBe(true);
                expect(ev.extendedProps.canEdit).toBe(true);
                expect(ev.extendedProps.canDelete).toBe(true);
                // relevant parties should reflect both sets (>0)
                expect(ev.extendedProps.relevantParties).toBe('1 employee, 1 position');
            });

            it('handles API errors when fetching scheduled events', async () => {
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

    describe('RSVP API', () => {
        it('posts RSVP choice and returns server payload', async () => {
            mockApi.mockResolvedValue({ myBooking: 'Booked', bookedCount: 3, spotsLeft: 7 });

            const res = await rsvpScheduledEvent(99, 'book');

            expect(mockApi).toHaveBeenCalledWith('event-schedules/99/rsvp', {
                method: 'POST',
                data: { choice: 'book' },
            });
            expect(res).toEqual({ myBooking: 'Booked', bookedCount: 3, spotsLeft: 7 });
        });
    });

    describe('Attendance APIs', () => {
        it('gets attendance rows', async () => {
            const rows = [
                { employeeNumber: 'E1', attended: true, checkInTime: '2025-01-01T10:00:00Z' },
                { employeeNumber: 'E2', attended: false },
            ];
            mockApi.mockResolvedValue(rows);

            const res = await getAttendance(123);

            expect(mockApi).toHaveBeenCalledWith('event-schedules/123/attendance', { method: 'GET' });
            expect(res).toEqual(rows);
        });

        it('sets attendance map', async () => {
            mockApi.mockResolvedValue(undefined);

            await setAttendance(123, { employeeNumbers: ['E1', 'E2'], attendance: { E1: true, E2: false } });

            expect(mockApi).toHaveBeenCalledWith('event-schedules/123/attendance', {
                method: 'POST',
                data: { employeeNumbers: ['E1', 'E2'], attendance: { E1: true, E2: false } },
            });
        });

        it('gets booked employees for attendance selection', async () => {
            const booked = [
                { employeeNumber: 'E1', name: 'Jane Doe' },
                { employeeNumber: 'E2', name: 'John Doe' },
            ];
            mockApi.mockResolvedValue(booked);

            const res = await getBookedEmployees(456);

            expect(mockApi).toHaveBeenCalledWith('event-schedules/456/booked', { method: 'GET' });
            expect(res).toEqual(booked);
        });

        it('gets attendance candidates', async () => {
            const cands = [
                { employeeNumber: 'E9', name: 'Candidate' },
            ];
            mockApi.mockResolvedValue(cands);

            const res = await getAttendanceCandidates(456);

            expect(mockApi).toHaveBeenCalledWith('event-schedules/456/attendance-candidates', { method: 'GET' });
            expect(res).toEqual(cands);
        });
    });
});