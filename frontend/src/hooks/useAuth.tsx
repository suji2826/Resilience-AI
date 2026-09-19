import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  role: UserRole;
  isAuthenticated: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (roleName: UserRole) => Promise<void>;
  validateSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedToken = localStorage.getItem('resilience_token');
      const saved = localStorage.getItem('resilience_user');
      if (savedToken && saved) {
        return JSON.parse(saved);
      }
    } catch {
      localStorage.removeItem('resilience_token');
      localStorage.removeItem('resilience_user');
    }
    return null;
  });

  const login = useCallback(async (email: string, password: string = 'resilience2026') => {
    try {
      const data = await api.login(email, password);
      localStorage.setItem('resilience_token', data.access_token);
      localStorage.setItem('resilience_user', JSON.stringify(data.user));
      setUser(data.user);
    } catch (err) {
      console.error('Login error:', err);
      localStorage.removeItem('resilience_token');
      localStorage.removeItem('resilience_user');
      setUser(null);
      throw err;
    }
  }, []);

  const validateSession = useCallback(async (): Promise<boolean> => {
    const token = localStorage.getItem('resilience_token');
    if (!token) return false;
    try {
      const me = await api.getMe();
      if (me && me.email) {
        setUser(me);
        localStorage.setItem('resilience_user', JSON.stringify(me));
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, []);

  // Ensure an active authenticated session on initial mount
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      const token = localStorage.getItem('resilience_token');
      if (token) {
        // Validate existing token
        try {
          const me = await api.getMe();
          if (isMounted && me && me.email) {
            setUser(me);
            return;
          }
        } catch {
          // Token is stale / expired
          console.warn('[Auth] Stale token detected on mount. Refreshing demo session...');
        }
      }

      // Establish fresh session
      try {
        await login('national.admin@resilience.gov.in', 'resilience2026');
      } catch (e) {
        console.warn('[Auth] Initial demo login fallback:', e);
      }
    }

    initAuth();

    // Listen for background token refreshes and expiries
    const onAuthRefreshed = (e: Event) => {
      const customEvent = e as CustomEvent<User>;
      if (customEvent.detail) {
        setUser(customEvent.detail);
      }
    };

    const onAuthExpired = () => {
      console.warn('[Auth] Session expired event received, auto-renewing demo credentials...');
      login('national.admin@resilience.gov.in', 'resilience2026').catch(() => {});
    };

    window.addEventListener('resilience:auth_refreshed', onAuthRefreshed);
    window.addEventListener('resilience:auth_expired', onAuthExpired);

    return () => {
      isMounted = false;
      window.removeEventListener('resilience:auth_refreshed', onAuthRefreshed);
      window.removeEventListener('resilience:auth_expired', onAuthExpired);
    };
  }, [login]);

  const switchDemoRole = async (roleName: UserRole) => {
    const roleEmailMap: Record<UserRole, string> = {
      NATIONAL_ADMIN: 'national.admin@resilience.gov.in',
      STATE_ADMIN: 'state.tn.admin@resilience.gov.in',
      DISTRICT_ADMIN: 'district.namakkal@resilience.gov.in',
      PHC_ADMIN: 'phc.kollihills@resilience.gov.in',
      SUPPLY_CHAIN_MANAGER: 'supply.chain@resilience.gov.in',
    };

    const targetEmail = roleEmailMap[roleName] || 'national.admin@resilience.gov.in';
    await login(targetEmail, 'resilience2026');
  };

  const logout = () => {
    localStorage.removeItem('resilience_token');
    localStorage.removeItem('resilience_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'NATIONAL_ADMIN',
        isAuthenticated: !!user,
        login,
        logout,
        switchDemoRole,
        validateSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
