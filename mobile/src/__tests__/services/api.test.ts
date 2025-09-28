import { api } from '@/services/api';
import * as session from '@/services/session';

jest.mock('axios', () => {
  const actual = jest.requireActual('axios');
  const instance = {
    defaults: { headers: { common: {} } },
    interceptors: { request: { use: jest.fn(fn => { instance._req = fn; }), }, response: { use: jest.fn((succ, err) => { instance._resErr = err; }) } },
    get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn(),
  } as any;
  const create = jest.fn(() => instance);
  return { ...actual, create };
});

jest.spyOn(console, 'log').mockImplementation(() => {});

describe('api service', () => {
  test('adds Authorization header when token exists', () => {
    jest.spyOn(session, 'getToken').mockReturnValue('tok123');
    const cfg: any = { method: 'get', url: 'resource', headers: {} };
    const reqInterceptor = (api as any)._req; // stored when interceptor was registered
    const result = reqInterceptor(cfg);
    expect(result.headers.Authorization).toBe('Bearer tok123');
  });

  test('does not add Authorization header when no token', () => {
    jest.spyOn(session, 'getToken').mockReturnValue(null);
    const cfg: any = { method: 'get', url: 'res', headers: {} };
    const reqInterceptor = (api as any)._req;
    const result = reqInterceptor(cfg);
    expect(result.headers.Authorization).toBeUndefined();
  });

  test('response error propagates', async () => {
    const err = new Error('boom');
    const resErr = (api as any)._resErr;
    await expect(resErr(err)).rejects.toThrow('boom');
  });
});
