import type { AuthResponse, UserDto } from '@awaaz/shared';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api, setApiToken } from './api';
import { storage } from './storage';

const TOKEN_KEY = 'awaaz.citizen.token';

interface SessionValue {
  user: UserDto | null;
  loading: boolean;
  signIn: (auth: AuthResponse) => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const restore = async () => {
      const token = await storage.get(TOKEN_KEY);
      if (!token) return;
      setApiToken(token);
      try {
        setUser(await api.me());
      } catch (error) {
        setApiToken(null);
        if (error instanceof ApiError && error.status === 401) await storage.remove(TOKEN_KEY);
      }
    };
    void restore().finally(() => setLoading(false));
  }, []);

  const signIn = useCallback(async (auth: AuthResponse) => {
    setApiToken(auth.token);
    await storage.set(TOKEN_KEY, auth.token);
    setUser(auth.user);
  }, []);

  const signOut = useCallback(async () => {
    setApiToken(null);
    await storage.remove(TOKEN_KEY);
    queryClient.clear();
    setUser(null);
  }, [queryClient]);

  const value = useMemo(() => ({ user, loading, signIn, signOut }), [user, loading, signIn, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used inside SessionProvider');
  return value;
}
