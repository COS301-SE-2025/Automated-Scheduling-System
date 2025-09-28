import * as svc from '@/services/eventDefinitions';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
}));

describe('eventDefinitions service', () => {
  beforeEach(() => {
    (api.get as jest.Mock).mockReset();
    (api.post as jest.Mock).mockReset();
    (api.put as jest.Mock).mockReset();
    (api.delete as jest.Mock).mockReset();
  });

  test('getEventDefinitions returns empty array fallback', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: undefined });
    const res = await svc.getEventDefinitions();
    expect(api.get).toHaveBeenCalledWith('event-definitions');
    expect(res).toEqual([]);
  });

  test('createEventDefinition maps payload and returns data', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { CustomEventID: 1 } });
    const result = await svc.createEventDefinition({ EventName: 'E', StandardDuration: '1h', ActivityDescription: 'D' });
    expect(api.post).toHaveBeenCalledWith('event-definitions', expect.objectContaining({ eventName: 'E', standardDuration: '1h' }));
    expect(result).toEqual({ CustomEventID: 1 });
  });

  test('updateEventDefinition sends only changed fields', async () => {
    (api.put as jest.Mock).mockResolvedValue({ data: { CustomEventID: 2 } });
    await svc.updateEventDefinition(2, { EventName: 'New' });
    expect(api.put).toHaveBeenCalledWith('event-definitions/2', { eventName: 'New' });
  });

  test('deleteEventDefinition calls delete', async () => {
    (api.delete as jest.Mock).mockResolvedValue({});
    await svc.deleteEventDefinition(5);
    expect(api.delete).toHaveBeenCalledWith('event-definitions/5');
  });
});
