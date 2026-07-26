import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { isPreviewMode } from '../utils/environment';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const inactivityTimer = useRef(null);
  const pingInterval = useRef(null);
  const listenerCleanup = useRef(null);

  useEffect(() => {
    checkAuthStatus();
    return () => {
      clearAllTimers();
    };
  }, []);

  const clearAllTimers = useCallback(() => {
    if (inactivityTimer.current) { clearTimeout(inactivityTimer.current); inactivityTimer.current = null; }
    if (pingInterval.current) { clearInterval(pingInterval.current); pingInterval.current = null; }
    if (listenerCleanup.current) { listenerCleanup.current(); listenerCleanup.current = null; }
  }, []);

  const startInactivityTimer = useCallback(() => {
    clearAllTimers();

    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setIsLocked(true);
      }, 10 * 60 * 1000);
    };

    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    pingInterval.current = setInterval(() => {
      if (window.electronAPI?.authSessionPing) {
        window.electronAPI.authSessionPing().catch(() => {});
      }
    }, 60000);

    listenerCleanup.current = () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [clearAllTimers]);

  useEffect(() => {
    if (user && !isPreviewMode()) {
      startInactivityTimer();
    } else {
      clearAllTimers();
    }
    return clearAllTimers;
  }, [user, startInactivityTimer, clearAllTimers]);

  const checkAuthStatus = async () => {
    const storedAuth = localStorage.getItem('pos_auth');
    const storedUser = localStorage.getItem('pos_user');
    
    if (storedAuth && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        if (!isPreviewMode() && window.electronAPI) {
          try {
            const userExists = await window.electronAPI.validateUserExists(parsedUser.id);
            if (!userExists) {
              localStorage.removeItem('pos_auth');
              localStorage.removeItem('pos_user');
              setLoading(false);
              return;
            }
          } catch (error) {
            localStorage.removeItem('pos_auth');
            localStorage.removeItem('pos_user');
            setLoading(false);
            return;
          }
        }
        
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('pos_auth');
        localStorage.removeItem('pos_user');
      }
    }
    setLoading(false);
  };

  const loginWithDemoUsers = useCallback(async (credentials) => {
    const demoUsers = [
      { username: 'admin', password: 'admin123', role: 'admin', fullName: 'Administrateur', permissions: ['all'] },
      { username: 'caissier', password: 'caissier123', role: 'cashier', fullName: 'Caissier', permissions: ['sales', 'customers'] },
      { username: 'manager', password: 'manager123', role: 'manager', fullName: 'Manager', permissions: ['sales', 'products', 'customers', 'reports', 'inventory'] },
    ];

    const validUser = demoUsers.find(u => u.username === credentials.username && u.password === credentials.password);
    if (!validUser) throw new Error("Nom d'utilisateur ou mot de passe incorrect");

    const mockUser = {
      id: validUser.username === 'admin' ? 1 : validUser.username === 'caissier' ? 2 : 3,
      username: validUser.username,
      email: `${validUser.username}@pos.com`,
      role: validUser.role,
      fullName: validUser.fullName,
      full_name: validUser.fullName,
      permissions: validUser.permissions,
    };

    setUser(mockUser);
    localStorage.setItem('pos_auth', 'true');
    localStorage.setItem('pos_user', JSON.stringify(mockUser));
    return mockUser;
  }, []);

  const loginWithDatabase = useCallback(async (credentials) => {
    try {
      if (!window.electronAPI) throw new Error('Système non disponible');

      const authenticatedUser = await window.electronAPI.authenticateUser(
        credentials.username,
        credentials.password
      );

      if (!authenticatedUser) throw new Error("Nom d'utilisateur ou mot de passe incorrect");

      setUser(authenticatedUser);
      localStorage.setItem('pos_auth', 'true');
      localStorage.setItem('pos_user', JSON.stringify(authenticatedUser));
      
      try {
        await window.electronAPI.authSessionSet?.(authenticatedUser.id, authenticatedUser);
      } catch (e) { /* optional */ }

      return authenticatedUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const login = useCallback(async (credentials) => {
    if (isPreviewMode()) {
      return loginWithDemoUsers(credentials);
    }
    return loginWithDatabase(credentials);
  }, [loginWithDemoUsers, loginWithDatabase]);

  const loginByUserSelect = useCallback(async (userObj, method, credential) => {
    try {
      if (!window.electronAPI) throw new Error('Système non disponible');

      let authUser;
      if (method === 'pin') {
        authUser = await window.electronAPI.authenticateByPin(userObj.id, credential);
      } else {
        authUser = await window.electronAPI.authenticateUser(userObj.username, credential);
      }

      if (!authUser || !authUser.id) {
        throw new Error("Identifiants incorrects");
      }

      setUser(authUser);
      localStorage.setItem('pos_auth', 'true');
      localStorage.setItem('pos_user', JSON.stringify(authUser));

      try {
        await window.electronAPI.authSessionSet?.(authUser.id, authUser);
      } catch (e) { /* optional */ }

      return authUser;
    } catch (error) {
      throw error;
    }
  }, []);

  const unlock = useCallback(() => {
    setIsLocked(false);
    startInactivityTimer();
  }, [startInactivityTimer]);

  // Logout is synchronous: IPC calls are fire-and-forget to prevent async gaps
  // between setIsLocked(false) and setUser(null) which caused React error #300
  // (MainPOSApp defined inline + async state transition = cascading unmount/remount)
  const logout = useCallback(() => {
    clearAllTimers();
    setIsLocked(false);
    setUser(null);
    localStorage.removeItem('pos_auth');
    localStorage.removeItem('pos_user');
    localStorage.removeItem('pos_session_orders');

    // Fire-and-forget IPC cleanup (non-blocking)
    if (!isPreviewMode() && user && window.electronAPI) {
      window.electronAPI.logout(user.id).catch(() => {});
      window.electronAPI.authSessionClear?.().catch(() => {});
    }
  }, [clearAllTimers, user]);

  const setUserDirectly = useCallback((userData) => {
    setUser(userData);
    localStorage.setItem('pos_auth', 'true');
    localStorage.setItem('pos_user', JSON.stringify(userData));
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!user) return false;
    if (user.permissions?.includes('all')) return true;
    return user.permissions?.includes(permission);
  }, [user]);

  const value = useMemo(() => ({
    user,
    login,
    loginByUserSelect,
    logout,
    setUserDirectly,
    hasPermission,
    loading,
    isAuthenticated: !!user,
    isLocked,
    unlock,
  }), [user, login, loginByUserSelect, logout, setUserDirectly, hasPermission, loading, isLocked, unlock]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
