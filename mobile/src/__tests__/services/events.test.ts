import * as svc from '@/services/events';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('events service', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockReset();
    (api.post as jest.Mock).mockReset();
    (api.put as jest.Mock).mockReset();
    (api.delete as jest.Mock).mockReset();
  });

  const backendSample = [{
    CustomEventScheduleID: 10,
    CustomEventID: 2,
    Title: 'Title',
    EventStartDate: '2025-01-01T00:00:00Z',
    EventEndDate: '2025-01-01T01:00:00Z',
    RoomName: 'Room',
    MaximumAttendees: 5,
    MinimumAttendees: 1,
    StatusName: 'Scheduled',
    CreationDate: '2024-12-31T23:00:00Z',
    CustomEventDefinition: { EventName: 'Def', Facilitator: 'Fac' },
    Employees: [{ employee_number: 'E1' }],
    Positions: [{ position_matrix_code: 'P1' }],
    color: '#fff',
  }];

  test('getScheduledEvents maps backend to mobile shape', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: backendSample });
    const res = await svc.getScheduledEvents();
    expect(api.get).toHaveBeenCalledWith('event-schedules');
    expect(res[0]).toMatchObject({
      id: 10,
      definitionId: 2,
      title: 'Title',
      employees: ['E1'],
      positions: ['P1'],
      relevantParties: '1 employee, 1 position'
    });
  });

  test('createScheduledEvent maps response', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: backendSample });
    const res = await svc.createScheduledEvent({ customEventId: 2, title: 'Title', eventStartDate: 's', eventEndDate: 'e' } as any);
    expect(api.post).toHaveBeenCalledWith('event-schedules', expect.objectContaining({ customEventId: 2, title: 'Title' }));
    expect(res.length).toBe(1);
  });

  test('updateScheduledEvent calls correct endpoint', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: backendSample });
    await svc.updateScheduledEvent(10, { title: 'New' });
    expect(api.put).toHaveBeenCalledWith('event-schedules/10', expect.objectContaining({ title: 'New' }));
  });

  test('deleteScheduledEvent invokes delete', async () => {
    (api.delete as jest.Mock).mockResolvedValue({});
    await svc.deleteScheduledEvent(10);
    expect(api.delete).toHaveBeenCalledWith('event-schedules/10');
  });
});
