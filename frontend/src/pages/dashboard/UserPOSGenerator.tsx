import { useEffect } from 'react';

/**
 * Wrapper component that redirects to the admin POS Generator
 * but ensures user context is maintained (not admin context)
 */
const UserPOSGenerator = () => {
  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const adminBase = 
      import.meta.env.VITE_ADMIN_APP_URL || 
      import.meta.env.VITE_ADMIN_URL || 
      'http://localhost:5174';
    const targetOrigin = adminBase.replace(/\/$/, '');

    const params = new URLSearchParams();
    params.set('mode', 'user');
    params.set('userId', userData.id || 'guest');
    if (userData.name || userData.fullName || userData.companyName) {
      params.set('userName', userData.name || userData.fullName || userData.companyName);
    }
    if (userData.email) {
      params.set('userEmail', userData.email);
    }
    params.set('source', 'client-portal');

    window.location.href = `${targetOrigin}/pos-generator?${params.toString()}`;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to POS Generator...</p>
      </div>
    </div>
  );
};

export default UserPOSGenerator;
