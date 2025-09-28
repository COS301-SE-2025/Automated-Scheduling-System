import * as auth from '@/services/auth';
import api from '@/services/api';

jest.mock('@/services/api', () => ({
  post: jest.fn(),
  get: jest.fn(),
}));

describe('auth service', () => {
  beforeEach(() => {
    (api.post as jest.Mock).mockReset();
    (api.get as jest.Mock).mockReset();
  });

  test('login posts form data and returns payload', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { token: 't', user: { id: 1 } } });
    const result = await auth.login({ email: 'a', password: 'b' });
    expect(api.post).toHaveBeenCalledWith('/login', expect.any(URLSearchParams), expect.any(Object));
    expect(result).toEqual({ token: 't', user: { id: 1 } });
  });

  test('fetchProfile calls /profile', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { id: 2 } });
    const result = await auth.fetchProfile();
    expect(api.get).toHaveBeenCalledWith('/profile');
    expect(result).toEqual({ id: 2 });
  });

  test('fetchMyPermissions returns empty array fallback', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: undefined });
    const perms = await auth.fetchMyPermissions();
    expect(api.get).toHaveBeenCalledWith('/roles/permissions');
    expect(perms).toEqual([]);
  });

  test('signup posts and maps response structure', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { user: { id: 5 }, token: 'tok' } });
    const res = await auth.signup({ email: 'e', password: 'p', name: 'N', confirmPassword: 'p' } as any);
    expect(api.post).toHaveBeenCalledWith('/register', { email: 'e', password: 'p', name: 'N', confirmPassword: 'p' });
    expect(res).toEqual({ user: { id: 5 }, token: 'tok' });
  });

  test('forgotPassword posts email', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: { message: 'ok' } });
    const res = await auth.forgotPassword('x@y');
    expect(api.post).toHaveBeenCalledWith('/forgot-password', { email: 'x@y' });
    expect(res).toEqual({ message: 'ok' });
  });
});
