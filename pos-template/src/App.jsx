import { useState, useEffect, useCallback, useMemo, lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/pos-animations.css';

// Configuration
import { POSConfiguration } from './lib/POSConfiguration';

// Components
import LicenseCheck from './components/LicenseCheck';
import POSWithAuth from './components/POSWithAuth';
import SetupWizard from './components/SetupWizard';
import UserSelectScreen from './components/UserSelectScreen';
import AuthKeyboard from './components/AuthKeyboard';
import LockScreen from './components/LockScreen';
import Layout from './components/Layout';
import ErrorBoundary from './components/ErrorBoundary';
import { DebugPanel } from './components/DebugPanel';
import VirtualKeyboard from './components/VirtualKeyboard';

// Debug utilities
import './utils/debug';

// Lazy load page components for better performance
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sales = lazy(() => import('./pages/Sales'));
const Products = lazy(() => import('./pages/Products'));
const Reports = lazy(() => import('./pages/Reports'));
const Settings = lazy(() => import('./pages/Settings'));
const Customers = lazy(() => import('./pages/Customers'));
const Tables = lazy(() => import('./pages/Tables'));
const Kitchen = lazy(() => import('./pages/Kitchen'));
const Appointments = lazy(() => import('./pages/Appointments'));
const Services = lazy(() => import('./pages/Services'));
const Suppliers = lazy(() => import('./pages/Suppliers'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Barcode = lazy(() => import('./pages/Barcode'));
const QuickService = lazy(() => import('./pages/QuickService'));
const UserAdmin = lazy(() => import('./pages/UserAdmin'));
const MenuManagement = lazy(() => import('./pages/MenuManagement'));
const Takeaway = lazy(() => import('./pages/Takeaway'));
const Loyalty = lazy(() => import('./pages/Loyalty'));
const PaymentAdvanced = lazy(() => import('./pages/PaymentAdvanced'));
const GiftCards = lazy(() => import('./pages/GiftCards'));
const Prescription = lazy(() => import('./pages/Prescription'));
const Production = lazy(() => import('./pages/Production'));
const HardwareSettings = lazy(() => import('./pages/HardwareSettings'));
const ReceiptDesigner = lazy(() => import('./pages/ReceiptDesigner'));
const CashRegister = lazy(() => import('./pages/CashRegister'));

// Hooks
import { useAppConfig } from './hooks/useAppConfig';
import { useLicense } from './hooks/useLicense';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnlyRoute from './components/AdminOnlyRoute';
import { isPreviewMode } from './utils/environment';

// Loading component for lazy-loaded pages
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
  </div>
);

// MainPOSApp extracted outside AppContent to prevent infinite re-mount cycles.
// Defining it inside the render body created a NEW component type on every render,
// causing React to unmount/remount the entire Router tree (error #300).
function MainPOSApp({ config, license }) {
  return (
    <Router>
      <div className="pos-app pos-application min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Layout config={config} license={license}>
          <main className="transition-all duration-300 ease-in-out">
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
                <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
                {/* DEBUG: Inventory route below - should be commented out for disabled inventory */}
                <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
                <Route path="/barcode" element={<ProtectedRoute><Barcode /></ProtectedRoute>} />
                <Route path="/quick-service" element={<ProtectedRoute><QuickService /></ProtectedRoute>} />
                <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
                <Route path="/tables" element={<ProtectedRoute><Tables /></ProtectedRoute>} />
                <Route path="/kitchen" element={<ProtectedRoute><Kitchen /></ProtectedRoute>} />
                <Route path="/menu-management" element={<ProtectedRoute><MenuManagement /></ProtectedRoute>} />
                <Route path="/takeaway" element={<ProtectedRoute><Takeaway /></ProtectedRoute>} />
                <Route path="/loyalty" element={<ProtectedRoute><Loyalty /></ProtectedRoute>} />
                <Route path="/payment-advanced" element={<ProtectedRoute><PaymentAdvanced /></ProtectedRoute>} />
                <Route path="/gift-cards" element={<ProtectedRoute><GiftCards /></ProtectedRoute>} />
                <Route path="/prescription" element={<ProtectedRoute><Prescription /></ProtectedRoute>} />
                <Route path="/production" element={<ProtectedRoute><Production /></ProtectedRoute>} />
                <Route path="/appointments" element={<ProtectedRoute><Appointments /></ProtectedRoute>} />
                <Route path="/services" element={<ProtectedRoute><Services /></ProtectedRoute>} />
                <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
                <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
                <Route path="/hardware-settings" element={<ProtectedRoute><HardwareSettings /></ProtectedRoute>} />
                <Route path="/receipt-designer" element={<ProtectedRoute><ReceiptDesigner /></ProtectedRoute>} />
                <Route path="/caisse" element={<ProtectedRoute><CashRegister /></ProtectedRoute>} />
                {/* Admin Only Routes */}
                <Route path="/user-admin" element={<AdminOnlyRoute><UserAdmin /></AdminOnlyRoute>} />
                <Route path="/user-management" element={<AdminOnlyRoute><UserAdmin /></AdminOnlyRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>
        </Layout>
      </div>
    </Router>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
      <DebugPanel />
    </ErrorBoundary>
  );
}

function AppContent() {
  const { config, loading: configLoading } = useAppConfig();
  const { license, isValid: licenseValid, loading: licenseLoading } = useLicense();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  const [checkingSetup, setCheckingSetup] = useState(!isPreviewMode());
  const { user, loading: authLoading, setUserDirectly, isLocked, unlock, logout, loginByUserSelect } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [authError, setAuthError] = useState('');
  const [authLoading2, setAuthLoading2] = useState(false);

  // Clear selectedUser when user becomes null (e.g. after logout)
  useEffect(() => {
    if (!user) {
      setSelectedUser(null);
      setAuthError('');
    }
  }, [user]);

  // Check if first-time setup is needed (production mode only)
  useEffect(() => {
    if (!isPreviewMode()) {
      checkFirstTimeSetup();
    } else {
      setCheckingSetup(false);
    }
  }, []);

  // Listen for database location message from main process
  useEffect(() => {
    try {
      if (window.electronAPI && window.electronAPI.onDatabaseLocation) {
        window.electronAPI.onDatabaseLocation((dbPath) => {
          if (dbPath) {
            const pathParts = dbPath.split('\\');
            console.log('Database:', pathParts[pathParts.length - 1]);
          }
        });
      }
    } catch (err) { /* */ }
  }, []);

  const checkFirstTimeSetup = async () => {
    try {
      if (window.electronAPI) {
        const needsSetup = await window.electronAPI.needsFirstTimeSetup();
        const needsReset = await window.electronAPI.needsAdminPasswordReset();
        setIsFirstTime(needsSetup || needsReset);
      }
    } catch (error) {
      console.error('Failed to check setup status:', error);
      setIsFirstTime(false);
    } finally {
      setCheckingSetup(false);
    }
  };

  // Auto-login handler after first-time setup
  const handleSetupComplete = async (adminUser) => {
    if (adminUser && setUserDirectly) {
      setUserDirectly(adminUser);
    }
    setIsFirstTime(false);
  };

  // Phase 4: Global CSS Variables - Apply POSConfiguration theme globally
  useEffect(() => {
    if (config) {
      const getThemeConfig = () => {
        if (config.theme) return POSConfiguration.createConfig(config.theme);
        if (typeof window !== 'undefined' && window.themeConfig) return POSConfiguration.createConfig(window.themeConfig);
        return POSConfiguration.createConfig({
          primaryColor: '#3b82f6',
          secondaryColor: '#1e40af',
          backgroundColor: '#ffffff',
          textColor: '#1f2937',
          textMutedColor: '#6b7280',
          cardBorderColor: '#e5e7eb',
          currency: 'DT',
          currencyPosition: 'after'
        });
      };

      const themeConfig = getThemeConfig();
      const styleVars = POSConfiguration.getStyleVars(themeConfig);
      const root = document.documentElement;
      Object.entries(styleVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });
    }
  }, [config]);

  useEffect(() => {
    if (!configLoading && !licenseLoading && !authLoading && !checkingSetup) {
      setIsInitialized(true);
    }
  }, [configLoading, licenseLoading, authLoading, checkingSetup]);

  // Memoize callbacks BEFORE any early returns to satisfy Rules of Hooks
  const handleUserSelected = useCallback(async (userObj, method, credential) => {
    setAuthError('');
    setAuthLoading2(true);
    try {
      if (isPreviewMode()) {
        setUserDirectly({
          id: userObj.id || 1,
          username: userObj.username,
          role: userObj.role,
          fullName: userObj.fullName || userObj.full_name || userObj.username,
          full_name: userObj.fullName || userObj.full_name || userObj.username,
          email: `${userObj.username}@pos.com`,
          permissions: userObj.role === 'admin' ? ['all'] : userObj.role === 'manager' ? ['sales', 'products', 'customers', 'reports', 'inventory'] : ['sales', 'customers'],
        });
        return;
      }
      await loginByUserSelect(userObj, method, credential);
    } catch (err) {
      setAuthError(err.message || 'Erreur de connexion');
    } finally {
      setAuthLoading2(false);
    }
  }, [loginByUserSelect, setUserDirectly]);

  const handleUserCardClick = useCallback((userObj) => {
    setSelectedUser(userObj);
  }, []);

  const handleAuthBack = useCallback(() => {
    setSelectedUser(null);
    setAuthError('');
  }, []);

  const handleAuthSubmit = useCallback((password) => {
    if (selectedUser) {
      handleUserSelected(selectedUser, 'password', password);
    }
  }, [selectedUser, handleUserSelected]);

  const authUserName = useMemo(() => {
    if (!selectedUser) return '';
    return selectedUser.fullName || selectedUser.full_name || selectedUser.username;
  }, [selectedUser]);

  // Show first-time setup wizard (production mode only)
  if (!isPreviewMode() && isFirstTime && !checkingSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="text-center p-10 bg-card/80 backdrop-blur-md rounded-2xl shadow-2xl max-w-md border border-border/50">
          <div className="relative mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-full animate-pulse"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Initialisation du POS
          </h2>
          <p className="text-muted-foreground mb-6 text-lg">
            Chargement de la configuration...
          </p>
          <div className="space-y-2 text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span>Configuration:</span>
              <div className={`w-3 h-3 rounded-full ${configLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
            <div className="flex justify-between items-center">
              <span>Licence:</span>
              <div className={`w-3 h-3 rounded-full ${licenseLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
            </div>
            <div className="flex justify-between items-center">
              <span>Validation:</span>
              <div className={`w-3 h-3 rounded-full ${licenseValid ? 'bg-green-500' : 'bg-red-500'}`}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Check USB license if required
  if (config?.security?.requireUSBLicense && !licenseValid) {
    return <LicenseCheck />;
  }

  return (
    <>
      {isLocked && user && (
        <LockScreen user={user} onUnlock={unlock} onLogout={logout} config={config} />
      )}
      {!user ? (
        isPreviewMode() ? (
          <POSWithAuth config={config} />
        ) : selectedUser ? (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
            <div className="w-full max-w-sm">
              <div className="bg-card border border-border/50 rounded-3xl p-6 shadow-xl shadow-black/5">
                <AuthKeyboard
                  onSubmit={handleAuthSubmit}
                  onBack={handleAuthBack}
                  error={authError}
                  loading={authLoading2}
                  userName={authUserName}
                />
              </div>
            </div>
          </div>
        ) : (
          <UserSelectScreen
            config={config}
            onUserSelect={handleUserCardClick}
            loading={false}
          />
        )
      ) : (
        <MainPOSApp config={config} license={license} />
      )}
      <VirtualKeyboard disabled={!user} />
    </>
  );
}

export default App;
