import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!isAuthenticated) {
    // Return null instead of <Navigate to="/login">.
    // The parent (AppContent) already handles unauthenticated state by rendering
    // UserSelectScreen. Using <Navigate to="/login"> caused an infinite redirect
    // loop because there is no /login route — the catch-all * redirects to /,
    // ProtectedRoute fires again → loop → React error #300.
    return null;
  }

  return children;
}
