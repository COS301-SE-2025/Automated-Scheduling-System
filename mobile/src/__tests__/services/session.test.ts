import { getToken, setTokenAsync, getTokenAsync, setUserAsync, getUserAsync, setPermissionsAsync, getPermissionsAsync } from '@/services/session';

// We rely on the lightweight storage mocks from setupTests.

describe('session service', () => {
  test('set/get token async primes memory and sync getToken', async () => {
    await setTokenAsync('abc');
    const asyncVal = await getTokenAsync();
    expect(asyncVal).toBe('abc');
    expect(getToken()).toBe('abc');
  });

  test('clearing token sets memory to null', async () => {
    await setTokenAsync('zzz');
    await setTokenAsync(null);
    expect(getToken()).toBeNull();
  });

  test('set/get user', async () => {
    await setUserAsync({ id: 1, name: 'User' });
    const u = await getUserAsync();
    expect(u).toEqual({ id: 1, name: 'User' });
  });

  test('set/get permissions', async () => {
    await setPermissionsAsync(['events','users']);
    const perms = await getPermissionsAsync();
    expect(perms).toEqual(['events','users']);
  });
});
