import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { isAdminRole } from '../lib/permissions';

/**
 * AdminOnlyRoute - gates the user-management/admin sections.
 * Access is granted to the admin/superadmin roles, or to any user explicitly
 * granted the "gestion des utilisateurs" module (read) by the super admin.
 * Redirects others to the dashboard.
 */
export default function AdminOnlyRoute({ children }) {
  const { isAuthenticated, user, loading } = useAuth();
  const { canRead: canReadUserManagement, loaded: permsLoaded } = usePermissions('user-management');

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!isAuthenticated) {
    // Return null — parent (AppContent) handles unauthenticated state
    return null;
  }

  // Wait for permission rows to load before deciding (admin bypasses instantly).
  if (!isAdminRole(user?.role) && !permsLoaded) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  // Check if user is admin or has the user-management permission
  if (!isAdminRole(user?.role) && !canReadUserManagement) {
    console.warn(`⚠️ [ACCESS-DENIED] User ${user?.id} (${user?.role}) attempted to access admin section`);
    return <Navigate to="/" replace />;
  }

  console.log(`✅ [ADMIN-ACCESS] User ${user?.id} (${user?.role}) accessing admin section`);
  return children;
}
