import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const AccessModeContext = createContext();

/**
 * Context to handle whether the admin app is being accessed by:
 * - admin (full access)
 * - user (restricted to their own data)
 */
export const AccessModeProvider = ({ children }) => {
  const [mode, setMode] = useState('admin'); // 'admin' or 'user'
  const [currentUserId, setCurrentUserId] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlMode = params.get('mode');
    const urlUserId = params.get('userId');
    const urlUserName = params.get('userName');
    const urlUserEmail = params.get('userEmail');

    if (urlMode) {
      localStorage.setItem('accessMode', urlMode);
    }
    if (urlUserId) {
      localStorage.setItem('currentUserId', urlUserId);
    }
    if (urlUserName) {
      localStorage.setItem('currentUserName', urlUserName);
    }
    if (urlUserEmail) {
      localStorage.setItem('currentUserEmail', urlUserEmail);
    }

    const storedMode = localStorage.getItem('accessMode') || 'admin';
    const storedUserId = localStorage.getItem('currentUserId');
    const storedUserName = localStorage.getItem('currentUserName') || '';
    const storedUserEmail = localStorage.getItem('currentUserEmail') || '';

    const nextMode = urlMode || storedMode;
    const nextUserId = urlUserId || storedUserId;

    setMode(nextMode);
    setCurrentUserId(nextUserId);
    setCurrentUserProfile(
      nextUserId
        ? {
            id: nextUserId,
            name: urlUserName || storedUserName,
            email: urlUserEmail || storedUserEmail,
          }
        : null
    );

    // Listen for changes
    const handleStorageChange = () => {
      const newMode = localStorage.getItem('accessMode') || 'admin';
      const newUserId = localStorage.getItem('currentUserId');
      const newUserName = localStorage.getItem('currentUserName') || '';
      const newUserEmail = localStorage.getItem('currentUserEmail') || '';
      setMode(newMode);
      setCurrentUserId(newUserId);
      setCurrentUserProfile(
        newUserId
          ? {
              id: newUserId,
              name: newUserName,
              email: newUserEmail,
            }
          : null
      );
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [location.search]);

  const isUserMode = mode === 'user';
  const isAdminMode = mode === 'admin';

  return (
    <AccessModeContext.Provider value={{ 
      mode, 
      currentUserId, 
      currentUserProfile,
      isUserMode, 
      isAdminMode,
      setMode 
    }}>
      {children}
    </AccessModeContext.Provider>
  );
};

export const useAccessMode = () => {
  const context = useContext(AccessModeContext);
  if (!context) {
    throw new Error('useAccessMode must be used within AccessModeProvider');
  }
  return context;
};
