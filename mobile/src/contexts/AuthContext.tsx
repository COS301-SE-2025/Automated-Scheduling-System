import * as React from 'react';
import { login as apiLogin, fetchProfile, fetchMyPermissions } from '@/services/auth';
import { setTokenAsync, getTokenAsync, setUserAsync, getUserAsync, setPermissionsAsync, getPermissionsAsync } from '@/services/session';
import type { User } from '../types/user';
import type { AllowedPage } from '../types/role';

export type AuthState = {
  user: User | null;
  token: string | null;
  permissions: AllowedPage[] | null;
  busy: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: boolean;
  isElevated: boolean; // Admin or HR
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);
  const [token, setTok] = React.useState<string | null>(null);
  const [permissions, setPermissions] = React.useState<AllowedPage[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initializing, setInitializing] = React.useState(true);

  const isAuthenticated = !!token && !!user;
  const isElevated = !!(permissions?.includes('events' as AllowedPage) && (user?.role === 'Admin' || user?.role === 'HR'));

  React.useEffect(() => {
    (async () => {
      const savedToken = await getTokenAsync();
      const savedUser = await getUserAsync();
      const savedPermissions = await getPermissionsAsync();
      
      if (savedToken && savedUser) {
        setTok(savedToken);
        setUser(savedUser);
        setPermissions(savedPermissions as AllowedPage[] | null);
        
        try {
          setBusy(true);
          // Try to refresh profile and permissions
          const profile = await fetchProfile();
          const perms = await fetchMyPermissions();
          
          setUser(profile);
          setPermissions(perms);
          await setUserAsync(profile);
          await setPermissionsAsync(perms);
        } catch (e) {
          console.warn('Failed to refresh profile/permissions on init, using cached data:', e);
          // Keep the cached data, don't clear session unless it's a 401
          if (e && typeof e === 'object' && 'status' in e && (e.status === 401 || e.status === 403)) {
            console.warn('Auth error on refresh, clearing session');
            await setTokenAsync(null);
            await setUserAsync(null);
            await setPermissionsAsync(null);
            setTok(null);
            setUser(null);
            setPermissions(null);
          }
        } finally { 
          setBusy(false); 
        }
      }
      setInitializing(false);
    })();
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setBusy(true); 
    setError(null);
    try {
      const { token: tkn, user: loginUser } = await apiLogin({ email, password });
      
      await setTokenAsync(tkn);
      await setUserAsync(loginUser);
      setTok(tkn);
      setUser(loginUser);

      // Fetch permissions
      try {
        const perms = await fetchMyPermissions();
        await setPermissionsAsync(perms);
        setPermissions(perms);
      } catch (e) {
        console.warn('Failed to fetch permissions after login:', e);
        setPermissions([]);
        await setPermissionsAsync([]);
      }
    } catch (e: any) {
      await setTokenAsync(null);
      await setUserAsync(null);
      await setPermissionsAsync(null);
      setTok(null);
      setUser(null);
      setPermissions(null);
      setError(e?.response?.data?.error || e?.message || 'Login failed');
      throw e;
    } finally { 
      setBusy(false); 
    }
  }, []);

  const signOut = React.useCallback(async () => {
    setUser(null); 
    setTok(null); 
    setPermissions(null);
    await setTokenAsync(null);
    await setUserAsync(null);
    await setPermissionsAsync(null);
  }, []);

  const value: AuthState = { 
    user, 
    token, 
    permissions,
    busy: busy || initializing, 
    error, 
    signIn, 
    signOut,
    isAuthenticated,
    isElevated
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
