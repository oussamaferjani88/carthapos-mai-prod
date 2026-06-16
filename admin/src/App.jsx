import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import './App.css';

// Contexts
import { AccessModeProvider } from './contexts/AccessModeContext';
import { useAccessMode } from './contexts/AccessModeContext';

// Components
import Layout from './components/layout/Layout';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Licenses from './pages/Licenses';
import Modules from './pages/Modules';
import POSGenerator from './pages/pos/POSGeneratorPage';
import POSPreviewPage from './pages/pos/POSPreviewPage';
import USBManager from './pages/management/USBManager';
import UserManagement from './pages/management/UserManagement';
import BIRequests from './pages/BIRequests';
import BiUploadPortal from './pages/BiUploadPortal';
import AdminBIDashboardManager from './pages/AdminBIDashboardManager';
import AdminBIAnalystWorkspace from './pages/AdminBIAnalystWorkspace';
import AdminBIAnalysisDetail from './pages/AdminBIAnalysisDetail';
import AdminBIReview from './pages/AdminBIReview';

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

function AppShell() {
  const { isUserMode } = useAccessMode();

  return (
    <div className="min-h-screen bg-background">
      <Layout hideNavigation={isUserMode}>
        <Routes>
          {isUserMode ? (
            <>
              <Route path="/pos-generator" element={<POSGenerator />} />
              <Route path="*" element={<Navigate to="/pos-generator" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/licenses" element={<Licenses />} />
              <Route path="/modules" element={<Modules />} />
              <Route path="/pos-generator" element={<POSGenerator />} />
              <Route path="/pos-preview" element={<POSPreviewPage />} />
              <Route path="/bi-requests" element={<BIRequests />} />
              <Route path="/bi-upload-portal" element={<BiUploadPortal />} />
              <Route path="/bi-dashboard-manager" element={<AdminBIDashboardManager />} />
              <Route path="/bi-analysis" element={<AdminBIAnalystWorkspace />} />
              <Route path="/bi-analysis/:id" element={<AdminBIAnalysisDetail />} />
              <Route path="/bi-review" element={<AdminBIReview />} />
              <Route path="/usb-manager" element={<USBManager />} />
              <Route path="/user-management" element={<UserManagement />} />
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
      <AppShell />
    </AccessModeProvider>
  );
}

export default App;

