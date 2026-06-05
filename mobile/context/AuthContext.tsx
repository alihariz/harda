// AuthContext — owns JWT lifecycle for the mobile app.
//
// On mount: hydrates tokens from SecureStore, decodes the access token to
// recover role + team_id without an extra round-trip. Exposes login / logout
// and the current user.

import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react';

import { api } from '@/lib/api';
import * as auth from '@/lib/auth';
import type { User, UserRole } from '@/lib/types';

interface AuthState {
  ready: boolean;
  user: User | null;
  role: UserRole | null;
  teamId: number | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
}

const Ctx = createContext<AuthContextValue | null>(null);

export const useAuth = (): AuthContextValue => {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside <AuthProvider>');
  return v;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    ready: false, user: null, role: null, teamId: null,
  });

  const hydrate = useCallback(async () => {
    await auth.hydrate();
    const token = await auth.getAccessToken();
    const claims = auth.decode(token);
    if (claims && claims.exp && claims.exp * 1000 > Date.now()) {
      setState({
        ready: true,
        user: null,                          // user object refreshed on next API call
        role: claims.role ?? 'user',
        teamId: claims.team_id ?? null,
      });
    } else {
      setState({ ready: true, user: null, role: null, teamId: null });
    }
  }, []);

  useEffect(() => { hydrate(); }, [hydrate]);

  const login = useCallback(async (email: string, password: string) => {
    const { access_token, refresh_token, user } = await api.login(email, password);
    await auth.setTokens(access_token, refresh_token);
    setState({
      ready: true,
      user,
      role: user.role,
      teamId: user.team_id,
    });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await auth.clearTokens();
    setState({ ready: true, user: null, role: null, teamId: null });
  }, []);

  const refreshMe = useCallback(async () => {
    // Lightweight: re-derive role/team from the stored token.
    const token = await auth.getAccessToken();
    const claims = auth.decode(token);
    if (claims) {
      setState((s) => ({
        ...s,
        role: claims.role ?? s.role ?? 'user',
        teamId: claims.team_id ?? s.teamId ?? null,
      }));
    }
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    ...state, login, logout, refreshMe,
  }), [state, login, logout, refreshMe]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
