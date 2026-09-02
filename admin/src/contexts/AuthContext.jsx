import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PermissionManager } from '../utils/permissions';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  // Session lives in an HttpOnly cookie — restoring it requires calling /me.
  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Not authenticated');
      const body = await res.json();
      const authUser = body?.data?.user;
      if (!authUser) throw new Error('Not authenticated');
      setUser(authUser);
      setIsAuthenticated(true);
    } catch {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // Connexion via HttpOnly cookie session (no token in localStorage)
  const login = async (credentials) => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Login failed');
    }

    const body = await res.json();
    const authUser = body?.data?.user;
    if (!authUser) throw new Error('Login failed');

    setUser(authUser);
    setIsAuthenticated(true);
    return authUser;
  };

  // Déconnexion
  const logout = async () => {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* ignore */ }
    clearSession();
  };

  const permissionManager = user && Array.isArray(user.permissions)
    ? new PermissionManager([
        ...(user.role === 'SUPER_ADMIN' ? ['all'] : []),
        ...user.permissions,
      ])
    : null;

  // Get Authorization header (kept for compatibility; sessions are cookie-based)
  const getAuthHeader = () => {
    return {};
  };

  // Vérifier une permission
  const hasPermission = (permission) => {
    return permissionManager ? permissionManager.hasPermission(permission) : false;
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin = () => {
    return !!user && ADMIN_ROLES.includes(user.role);
  };

  // Vérifier si l'utilisateur est caissier
  const isCashier = () => {
    return false;
  };

  // Obtenir les modules autorisés (admins see everything)
  const getAuthorizedModules = (allModules) => {
    return allModules || [];
  };

  const value = {
    isAuthenticated,
    user,
    permissionManager,
    loading,
    login,
    logout,
    restoreSession,
    hasPermission,
    isAdmin,
    isCashier,
    getAuthorizedModules,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
