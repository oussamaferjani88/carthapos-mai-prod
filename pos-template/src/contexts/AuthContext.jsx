import React, { createContext, useContext, useState, useEffect } from 'react';
import { isPreviewMode, logEnvironment } from '../utils/environment';

const AuthContext = createContext();

export { AuthContext }; // Export nommé pour Layout.jsx

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

  useEffect(() => {
    logEnvironment();
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const storedAuth = localStorage.getItem('pos_auth');
    const storedUser = localStorage.getItem('pos_user');
    
    if (storedAuth && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        
        // CRITICAL: In production mode, validate that the cached user actually exists in database
        if (!isPreviewMode() && window.electronAPI) {
          console.log('🔍 Validating cached user against database...');
          
          try {
            // Check if user exists in current database
            const userExists = await window.electronAPI.invoke('validate-user-exists', parsedUser.id);
            
            if (!userExists) {
              console.warn('⚠️ Cached user does not exist in current database - clearing session');
              localStorage.removeItem('pos_auth');
              localStorage.removeItem('pos_user');
              setLoading(false);
              return;
            }
            
            console.log('✅ Cached user validated successfully');
          } catch (error) {
            console.warn('⚠️ Could not validate cached user - clearing session:', error);
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

  const login = async (credentials) => {
    // PREVIEW MODE: Use demo users for testing
    if (isPreviewMode()) {
      return loginWithDemoUsers(credentials);
    }

    // PRODUCTION MODE: Authenticate against database
    return loginWithDatabase(credentials);
  };

  const loginWithDemoUsers = async (credentials) => {
    console.log('🌐 Preview mode: Using demo authentication');
    
    const demoUsers = [
      { 
        username: 'admin', 
        password: 'admin123', 
        role: 'admin', 
        fullName: 'Administrateur',
        permissions: ['all'] 
      },
      { 
        username: 'caissier', 
        password: 'caissier123', 
        role: 'cashier', 
        fullName: 'Caissier',
        permissions: ['sales', 'customers'] 
      },
      { 
        username: 'manager', 
        password: 'manager123', 
        role: 'manager', 
        fullName: 'Manager',
        permissions: ['sales', 'products', 'customers', 'reports', 'inventory'] 
      }
    ];

    const validUser = demoUsers.find(u => 
      u.username === credentials.username && u.password === credentials.password
    );

    if (!validUser) {
      throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
    }

    const mockUser = {
      id: validUser.username === 'admin' ? 1 : validUser.username === 'caissier' ? 2 : 3,
      username: validUser.username,
      email: `${validUser.username}@pos.com`,
      role: validUser.role,
      fullName: validUser.fullName,
      permissions: validUser.permissions
    };

    setUser(mockUser);
    localStorage.setItem('pos_auth', 'true');
    localStorage.setItem('pos_user', JSON.stringify(mockUser));
    
    return mockUser;
  };

  const loginWithDatabase = async (credentials) => {
    console.log('⚡ Production mode: Authenticating against database');
    
    try {
      if (!window.electronAPI) {
        throw new Error('Système non disponible');
      }

      const authenticatedUser = await window.electronAPI.authenticateUser(
        credentials.username,
        credentials.password
      );

      if (!authenticatedUser) {
        throw new Error('Nom d\'utilisateur ou mot de passe incorrect');
      }

      setUser(authenticatedUser);
      localStorage.setItem('pos_auth', 'true');
      localStorage.setItem('pos_user', JSON.stringify(authenticatedUser));
      
      return authenticatedUser;
    } catch (error) {
      console.error('❌ Authentication error:', error);
      throw error;
    }
  };

  const logout = async () => {
    console.log('🚪 Logout appelé depuis AuthContext');
    
    // Log logout to database in production mode
    if (!isPreviewMode() && user && window.electronAPI) {
      try {
        await window.electronAPI.logout(user.id);
      } catch (error) {
        console.error('❌ Error logging out in database:', error);
      }
    }
    
    setUser(null);
    localStorage.removeItem('pos_auth');
    localStorage.removeItem('pos_user');
    console.log('🚪 Logout terminé, utilisateur supprimé');
  };

  // Direct user setter for auto-login after first-time setup
  const setUserDirectly = (userData) => {
    console.log('👤 Setting user directly:', userData);
    setUser(userData);
    localStorage.setItem('pos_auth', 'true');
    localStorage.setItem('pos_user', JSON.stringify(userData));
  };

  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.permissions.includes('all')) return true;
    return user.permissions.includes(permission);
  };

  const value = {
    user,
    login,
    logout,
    setUserDirectly, // Expose for first-time setup auto-login
    hasPermission,
    loading,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
