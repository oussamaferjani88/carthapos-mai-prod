import React, { createContext, useContext, useState, useEffect } from 'react';
import { PermissionManager } from '../utils/permissions';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [permissionManager, setPermissionManager] = useState(null);
  const [loading, setLoading] = useState(true);

  // Charger l'état d'authentification au démarrage
  useEffect(() => {
    const savedToken = localStorage.getItem('pos_admin_token');
    const savedUser = localStorage.getItem('pos_admin_user');
    
    if (savedToken && savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setToken(savedToken);
        setUser(userData);
        setPermissionManager(new PermissionManager(userData.permissions || ['all']));
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erreur lors du chargement de l\'authentification:', error);
        localStorage.removeItem('pos_admin_token');
        localStorage.removeItem('pos_admin_user');
      }
    }
    setLoading(false);
  }, []);

  // Connexion avec JWT
  const login = (authData) => {
    const { token: jwtToken, user: userData } = authData;
    
    // Store JWT token
    setToken(jwtToken);
    setUser(userData);
    
    // Set permissions (admin has 'all', others have specific permissions)
    const permissions = userData.role === 'ADMIN' ? ['all'] : userData.permissions || [];
    setPermissionManager(new PermissionManager(permissions));
    setIsAuthenticated(true);
    
    // Sauvegarder dans localStorage
    localStorage.setItem('pos_admin_token', jwtToken);
    localStorage.setItem('pos_admin_user', JSON.stringify({
      ...userData,
      permissions
    }));
  };

  // Déconnexion
  const logout = () => {
    setToken(null);
    setUser(null);
    setPermissionManager(null);
    setIsAuthenticated(false);
    localStorage.removeItem('pos_admin_token');
    localStorage.removeItem('pos_admin_user');
  };

  // Get Authorization header
  const getAuthHeader = () => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Vérifier une permission
  const hasPermission = (permission) => {
    return permissionManager ? permissionManager.hasPermission(permission) : false;
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin = () => {
    return user && user.permissions.includes('all');
  };

  // Vérifier si l'utilisateur est caissier
  const isCashier = () => {
    return user && user.permissions.includes('sales_read') && !user.permissions.includes('all');
  };

  // Obtenir les modules autorisés
  const getAuthorizedModules = (allModules) => {
    if (!permissionManager) return [];
    return permissionManager.filterNavigationModules(allModules, user.permissions);
  };

  const value = {
    isAuthenticated,
    user,
    token,
    permissionManager,
    loading,
    login,
    logout,
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
