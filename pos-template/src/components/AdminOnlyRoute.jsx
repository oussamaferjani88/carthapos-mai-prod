import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * AdminOnlyRoute - Restricts access to admin users only
 * Redirects non-admin users to the dashboard
 */
export default function AdminOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is admin
  if (user?.role !== 'admin') {
    console.warn(`⚠️ [ACCESS-DENIED] User ${user?.id} (${user?.role}) attempted to access admin section`);
    return <Navigate to="/" replace />;
  }

  console.log(`✅ [ADMIN-ACCESS] User ${user?.id} (${user?.role}) accessing admin section`);
  return children;
}
