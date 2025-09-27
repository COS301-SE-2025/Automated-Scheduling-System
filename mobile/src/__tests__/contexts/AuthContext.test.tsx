import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

// ---- Mocks ----
const mockLogin = jest.fn();
const mockFetchProfile = jest.fn();
const mockFetchPermissions = jest.fn();

jest.mock('@/services/auth', () => ({
  login: (...args: any[]) => mockLogin(...args),
  fetchProfile: () => mockFetchProfile(),
  fetchMyPermissions: () => mockFetchPermissions(),
}));

const mockGetTokenAsync = jest.fn();
const mockGetUserAsync = jest.fn();
const mockGetPermissionsAsync = jest.fn();
const mockSetTokenAsync = jest.fn();
const mockSetUserAsync = jest.fn();
const mockSetPermissionsAsync = jest.fn();

jest.mock('@/services/session', () => ({
  getTokenAsync: () => mockGetTokenAsync(),
  getUserAsync: () => mockGetUserAsync(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  setTokenAsync: (...args: any[]) => mockSetTokenAsync(...args),
  setUserAsync: (...args: any[]) => mockSetUserAsync(...args),
  setPermissionsAsync: (...args: any[]) => mockSetPermissionsAsync(...args),
}));

// ---- Helper consumer ----
const Consumer: React.FC<{ onRender?: (state: any) => void }> = ({ onRender }) => {
  const ctx = useAuth();
  onRender?.(ctx);
  return null;
};

function renderWithProvider(onRender?: (s: any) => void) {
  return render(
    <AuthProvider>
      <Consumer onRender={onRender} />
    </AuthProvider>
  );
}

const baseUser = { id: 1, email: 'a@b.com', name: 'Alice', role: 'Admin' } as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthContext', () => {
  test('initializes with cached session and refreshes profile/permissions', async () => {
    mockGetTokenAsync.mockResolvedValue('tok');
    mockGetUserAsync.mockResolvedValue(baseUser);
    mockGetPermissionsAsync.mockResolvedValue(['events']);

    mockFetchProfile.mockResolvedValue({ ...baseUser, name: 'Alice R' });
    mockFetchPermissions.mockResolvedValue(['events', 'users']);

    let latest: any;
    renderWithProvider(s => (latest = s));

    // busy true during init
    expect(latest.busy).toBe(true);

    await waitFor(() => expect(latest.busy).toBe(false));

    expect(latest.user.name).toBe('Alice R');
    expect(latest.permissions).toEqual(['events', 'users']);
    expect(latest.isAuthenticated).toBe(true);
    expect(latest.isElevated).toBe(true); // Admin + events permission
    expect(mockSetUserAsync).toHaveBeenCalled();
    expect(mockSetPermissionsAsync).toHaveBeenCalled();
  });

  test('init keeps cached data when refresh fails with non-auth error', async () => {
    mockGetTokenAsync.mockResolvedValue('tok');
    mockGetUserAsync.mockResolvedValue(baseUser);
    mockGetPermissionsAsync.mockResolvedValue(['events']);

    mockFetchProfile.mockRejectedValue(new Error('network down'));

    let latest: any;
    renderWithProvider(s => (latest = s));

    await waitFor(() => expect(latest.busy).toBe(false));
    expect(latest.user).toEqual(baseUser);
    expect(latest.permissions).toEqual(['events']);
    expect(latest.isAuthenticated).toBe(true);
  });

  test('init clears session on 401 error', async () => {
    mockGetTokenAsync.mockResolvedValue('tok');
    mockGetUserAsync.mockResolvedValue(baseUser);
    mockGetPermissionsAsync.mockResolvedValue(['events']);

    const authErr: any = new Error('unauthorized');
    authErr.status = 401;
    mockFetchProfile.mockRejectedValue(authErr);

    let latest: any;
    renderWithProvider(s => (latest = s));

    await waitFor(() => expect(latest.busy).toBe(false));
    expect(latest.user).toBeNull();
    expect(latest.token).toBeNull();
    expect(latest.permissions).toBeNull();
    expect(latest.isAuthenticated).toBe(false);
  });

  test('signIn success flow sets user, token, permissions', async () => {
    mockGetTokenAsync.mockResolvedValue(null);
    mockGetUserAsync.mockResolvedValue(null);
    mockFetchProfile.mockResolvedValue(baseUser); // not used in signIn path directly
    mockGetPermissionsAsync.mockResolvedValue(null);

    mockLogin.mockResolvedValue({ token: 'ntok', user: baseUser });
    mockFetchPermissions.mockResolvedValue(['events']);

    let latest: any;
    renderWithProvider(s => (latest = s));
    await waitFor(() => expect(latest.busy).toBe(false)); // initial load complete

    await act(async () => {
      await latest.signIn('a@b.com', 'pw');
    });

    expect(mockLogin).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });
    expect(latest.user).toEqual(baseUser);
    expect(latest.token).toBe('ntok');
    expect(latest.permissions).toEqual(['events']);
    expect(latest.isAuthenticated).toBe(true);
  });

  test('signIn permission fetch failure falls back to empty permissions array', async () => {
    mockGetTokenAsync.mockResolvedValue(null);
    mockGetUserAsync.mockResolvedValue(null);
    mockGetPermissionsAsync.mockResolvedValue(null);
    mockLogin.mockResolvedValue({ token: 'ntok', user: baseUser });
    mockFetchPermissions.mockRejectedValue(new Error('perm fail'));

    let latest: any;
    renderWithProvider(s => (latest = s));
    await waitFor(() => expect(latest.busy).toBe(false));

    await act(async () => {
      await latest.signIn('a@b.com', 'pw');
    });

    expect(latest.permissions).toEqual([]);
  });

  test('signIn failure resets state and sets error', async () => {
    mockGetTokenAsync.mockResolvedValue(null);
    mockGetUserAsync.mockResolvedValue(null);
    mockGetPermissionsAsync.mockResolvedValue(null);

    const loginErr: any = new Error('bad creds');
    loginErr.response = { data: { error: 'Invalid login' } };
    mockLogin.mockRejectedValue(loginErr);

    let latest: any;
    renderWithProvider(s => (latest = s));
    await waitFor(() => expect(latest.busy).toBe(false));
    await act(async () => {
      await expect(latest.signIn('a@b.com', 'pw')).rejects.toThrow('bad creds');
    });

    // State should have been reset and error populated
    expect(latest.user).toBeNull();
    expect(latest.token).toBeNull();
    expect(latest.permissions).toBeNull();
    expect(latest.error).toBe('Invalid login');
  });

  test('signOut clears session', async () => {
    mockGetTokenAsync.mockResolvedValue('tok');
    mockGetUserAsync.mockResolvedValue(baseUser);
    mockGetPermissionsAsync.mockResolvedValue(['events']);
    mockFetchProfile.mockResolvedValue(baseUser);
    mockFetchPermissions.mockResolvedValue(['events']);

    let latest: any;
    renderWithProvider(s => (latest = s));
    await waitFor(() => expect(latest.busy).toBe(false));
    expect(latest.isAuthenticated).toBe(true);

    await act(async () => {
      await latest.signOut();
    });

    expect(latest.user).toBeNull();
    expect(latest.token).toBeNull();
    expect(latest.permissions).toBeNull();
    expect(latest.isAuthenticated).toBe(false);
  });
});
