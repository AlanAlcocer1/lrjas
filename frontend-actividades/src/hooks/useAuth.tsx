import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi } from '@/services/api';
import { TOKEN_KEY } from '@/config/api';
import type { ActividadesUser } from '@/types';

interface AuthContextType {
  user: ActividadesUser | null;
  loading: boolean;
  login: (code: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (key: string) => boolean;
  hasAnyPermission: (...keys: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ActividadesUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      authApi
        .me()
        .then(setUser)
        .catch(() => localStorage.removeItem(TOKEN_KEY))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (code: string) => {
    const res = await authApi.login(code);
    localStorage.setItem(TOKEN_KEY, res.accessToken);
    setUser(res.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const hasPermission = useCallback(
    (key: string) => !!user?.permissions?.includes(key),
    [user],
  );

  const hasAnyPermission = useCallback(
    (...keys: string[]) => keys.some((k) => user?.permissions?.includes(k)),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
        hasPermission,
        hasAnyPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
