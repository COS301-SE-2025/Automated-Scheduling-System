import * as React from 'react';
import { login as apiLogin, fetchProfile } from '@/services/auth';
import { setTokenAsync, getTokenAsync } from '@/services/session';

export type AuthState = {
  user: any | null;
  token: string | null;
  busy: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<any | null>(null);
  const [token, setTok] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [initializing, setInitializing] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      const saved = await getTokenAsync();
      if (saved) {
        setTok(saved);
        try {
          setBusy(true);
          const profile = await fetchProfile();
          setUser(profile);
        } catch {
          // token invalid -> clear
          await setTokenAsync(null);
          setTok(null);
        } finally { setBusy(false); }
      }
      setInitializing(false);
    })();
  }, []);

  const signIn = React.useCallback(async (email: string, password: string) => {
    setBusy(true); setError(null);
    try {
      const { token: tkn, user: loginUser } = await apiLogin({ email, password });
      await setTokenAsync(tkn);
      setTok(tkn);
      setUser(loginUser);
    } catch (e: any) {
      await setTokenAsync(null);
      setTok(null);
      setError(e?.response?.data?.error || e?.message || 'Login failed');
      throw e;
    } finally { setBusy(false); }
  }, []);

  const signOut = React.useCallback(() => {
    setUser(null); setTok(null); setTokenAsync(null);
  }, []);

  const value: AuthState = { user, token, busy: busy || initializing, error, signIn, signOut };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
