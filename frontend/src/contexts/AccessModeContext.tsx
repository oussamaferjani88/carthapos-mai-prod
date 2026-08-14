import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

interface AccessModeContextType {
  mode: string;
  currentUserId: string | null;
  currentUserProfile: UserProfile | null;
  isUserMode: boolean;
  isAdminMode: boolean;
  setMode: (mode: string) => void;
}

const AccessModeContext = createContext<AccessModeContextType | null>(null);

export const AccessModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setMode] = useState('admin');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlMode = params.get('mode');
    const urlUserId = params.get('userId');
    const urlUserName = params.get('userName');
    const urlUserEmail = params.get('userEmail');

    // AccessMode only activates when explicitly entering through URL params.
    // Normal login/register clears these keys, so stale identities never
    // leak into a real user session.
    if (urlMode || urlUserId) {
      if (urlMode) localStorage.setItem('accessMode', urlMode);
      if (urlUserId) localStorage.setItem('currentUserId', urlUserId);
      if (urlUserName) localStorage.setItem('currentUserName', urlUserName);
      if (urlUserEmail) localStorage.setItem('currentUserEmail', urlUserEmail);

      const nextMode = urlMode || 'admin';
      setMode(nextMode);
      setCurrentUserId(urlUserId || null);
      setCurrentUserProfile(
        urlUserId
          ? { id: urlUserId, name: urlUserName || '', email: urlUserEmail || '' }
          : null
      );
      return () => {
        // Leave the provider (navigate away) → drop the AccessMode identity so
        // it never survives into a normal user session.
        setMode('admin');
        setCurrentUserId(null);
        setCurrentUserProfile(null);
      };
    }

    // No URL identity params: AccessMode is inactive (admin), regardless of any
    // leftover keys.
    setMode('admin');
    setCurrentUserId(null);
    setCurrentUserProfile(null);
  }, [location.search]);

  return (
    <AccessModeContext.Provider
      value={{
        mode,
        currentUserId,
        currentUserProfile,
        isUserMode: mode === 'user',
        isAdminMode: mode === 'admin',
        setMode,
      }}
    >
      {children}
    </AccessModeContext.Provider>
  );
};

export const useAccessMode = () => {
  const context = useContext(AccessModeContext);
  if (!context) throw new Error('useAccessMode must be used within AccessModeProvider');
  return context;
};
