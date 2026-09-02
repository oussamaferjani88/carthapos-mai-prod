import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';
import { ADMIN_ROUTE_PERMISSIONS } from './utils/permissions';

// Contexts
import { AccessModeProvider } from './contexts/AccessModeContext';
import { useAccessMode } from './contexts/AccessModeContext';
import { useAuth } from './contexts/AuthContext';

// Components
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Licenses from './pages/Licenses';
import Modules from './pages/Modules';

import POSGenerator from './pages/pos/POSGeneratorPage';
import PosProjects from './pages/pos/PosProjects';
import POSPreviewPage from './pages/pos/POSPreviewPage';
import USBManager from './pages/management/USBManager';
import UserManagement from './pages/management/UserManagement';
import BIRequests from './pages/BIRequests';
import AdminRequestDetail from './pages/AdminRequestDetail';
import BiUploadPortal from './pages/BiUploadPortal';
import BiWizard from './pages/BiWizard';
import AdminDashboardViewer from './pages/AdminDashboardViewer';
import AdminDashboardAssign from './pages/AdminDashboardAssign';
import AssignmentManager from './pages/AssignmentManager';
import AdminNotifications from './pages/AdminNotifications';

// ============================================================================
// JWT AUTHENTICATION - DISABLED FOR DEVELOPMENT
// TODO: Re-enable before production deployment
// ============================================================================
// import { useAuth } from './contexts/AuthContext';
// import Login from './pages/Login';

// Protected Route Component (DISABLED)
// function ProtectedRoute({ children }) {
//   const { isAuthenticated, loading } = useAuth();
//   
//   if (loading) {
//     return (
//       <div className="min-h-screen flex items-center justify-center bg-background">
//         <div className="text-center">
//           <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
//           <p className="mt-4 text-muted-foreground">Loading...</p>
//         </div>
//       </div>
//     );
//   }
//   
//   if (!isAuthenticated) {
//     return <Navigate to="/login" replace />;
//   }
//   
//   return children;
// }

// Protected Route — requires an authenticated session (HttpOnly cookie)
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

// Route guard — blocks a page when the signed-in admin lacks the required
// permission. Advisory only: the server remains the source of truth (403).
function PermissionRoute({ permission, children }) {
  const { hasPermission, loading } = useAuth();

  if (loading) return null;

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppShell() {
  const { isUserMode } = useAccessMode();

  return (
    <div className="h-full bg-background">
      <Layout>
        <Routes>
          {isUserMode ? (
            <>
              <Route path="/pos-generator" element={<POSGenerator />} />
              <Route path="/pos-projects" element={<PosProjects />} />
              <Route path="*" element={<Navigate to="/pos-generator" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/clients']}><Clients /></PermissionRoute>} />
              <Route path="/licenses" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/licenses']}><Licenses /></PermissionRoute>} />
              <Route path="/modules" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/modules']}><Modules /></PermissionRoute>} />
              <Route path="/pos-generator" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/pos-generator']}><POSGenerator /></PermissionRoute>} />
              <Route path="/pos-projects" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/pos-projects']}><PosProjects /></PermissionRoute>} />
              <Route path="/pos-preview" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/pos-generator']}><POSPreviewPage /></PermissionRoute>} />
              <Route path="/bi-requests" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-requests']}><BIRequests /></PermissionRoute>} />
              <Route path="/bi-requests/:id" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-requests']}><AdminRequestDetail /></PermissionRoute>} />
              <Route path="/bi-assignments" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-assignments']}><AssignmentManager /></PermissionRoute>} />
              <Route path="/bi-notifications" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-notifications']}><AdminNotifications /></PermissionRoute>} />
              <Route path="/bi-upload-portal" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-upload-portal']}><BiUploadPortal /></PermissionRoute>} />
              <Route path="/bi-wizard" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-wizard']}><BiWizard /></PermissionRoute>} />
              <Route path="/bi-dashboard/:dashboardId" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-requests']}><AdminDashboardViewer /></PermissionRoute>} />
              <Route path="/bi-dashboard/:dashboardId/assign" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/bi-assignments']}><AdminDashboardAssign /></PermissionRoute>} />
              <Route path="/usb-manager" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/usb-manager']}><USBManager /></PermissionRoute>} />
              <Route path="/user-management" element={<PermissionRoute permission={ADMIN_ROUTE_PERMISSIONS['/user-management']}><UserManagement /></PermissionRoute>} />
            </>
          )}
        </Routes>
      </Layout>
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--card)',
            color: 'var(--card-foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <AccessModeProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<ProtectedRoute><AppShell /></ProtectedRoute>} />
      </Routes>
    </AccessModeProvider>
  );
}

export default App;

