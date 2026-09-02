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
import { requiredModulesByHref, isModuleSetEnabled } from './config/moduleRoutes';

// Contexts
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PermissionsProvider } from './contexts/PermissionsContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminOnlyRoute from './components/AdminOnlyRoute';
import PermissionRoute from './components/PermissionRoute';
import { isPreviewMode } from './utils/environment';

// Loading component for lazy-loaded pages
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
  </div>
);

// Route table: module gating mirrors `requiredModulesByHref` (built from
// POSNavbar's navigationConfig, see src/config/moduleRoutes.js) so a route
// is never reachable when its nav item is hidden, or vice versa.
const ROUTE_TABLE = [
  { path: '/', Component: Dashboard, admin: false, module: 'dashboard' },
  { path: '/sales', Component: Sales, admin: false, module: 'sales' },
  { path: '/products', Component: Products, admin: false, module: 'products' },
  { path: '/inventory', Component: Inventory, admin: false, module: 'inventory' },
  { path: '/barcode', Component: Barcode, admin: false, module: 'barcode' },
  { path: '/quick-service', Component: QuickService, admin: false, module: 'sales' },
  { path: '/customers', Component: Customers, admin: false, module: 'customers' },
  { path: '/tables', Component: Tables, admin: false, module: 'tables' },
  { path: '/kitchen', Component: Kitchen, admin: false, module: 'kitchen' },
  { path: '/menu-management', Component: MenuManagement, admin: false, module: 'products' },
  { path: '/takeaway', Component: Takeaway, admin: false, module: 'sales' },
  { path: '/loyalty', Component: Loyalty, admin: false, module: 'loyalty' },
  { path: '/payment-advanced', Component: PaymentAdvanced, admin: false, module: 'sales' },
  { path: '/gift-cards', Component: GiftCards, admin: false, module: 'gift_cards' },
  { path: '/prescription', Component: Prescription, admin: false, module: 'prescription' },
  { path: '/production', Component: Production, admin: false, module: 'production' },
  { path: '/appointments', Component: Appointments, admin: false, module: 'appointments' },
  { path: '/services', Component: Services, admin: false, module: 'services' },
  { path: '/suppliers', Component: Suppliers, admin: false, module: 'suppliers' },
  { path: '/reports', Component: Reports, admin: false, module: 'reports' },
  { path: '/settings', Component: Settings, admin: false, module: 'settings' },
  { path: '/hardware-settings', Component: HardwareSettings, admin: false },
  { path: '/receipt-designer', Component: ReceiptDesigner, admin: false },
  { path: '/caisse', Component: CashRegister, admin: false, module: 'sales' },
  { path: '/user-admin', Component: UserAdmin, admin: true },
  { path: '/user-management', Component: UserAdmin, admin: true },
];

// MainPOSApp extracted outside AppContent to prevent infinite re-mount cycles.
// Defining it inside the render body created a NEW component type on every render,
// causing React to unmount/remount the entire Router tree (error #300).
function MainPOSApp({ config, license }) {
  const enabledModules = (config?.modules || [])
    .filter(m => m.isEnabled !== false)
    .map(m => m.name);

  return (
    <Router>
      <div className="pos-app pos-application min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Layout config={config} license={license}>
          <main className="transition-all duration-300 ease-in-out">
            <Suspense fallback={<PageLoadingFallback />}>
              <Routes>
                {ROUTE_TABLE.filter(({ path }) =>
                  isModuleSetEnabled(requiredModulesByHref[path], enabledModules)
                ).map((route) => {
                  const RouteComponent = route.Component;
                  const Guard = route.admin ? AdminOnlyRoute : ProtectedRoute;
                  const mod = route.admin ? undefined : route.module;
                  return (
                    <Route
                      key={route.path}
                      path={route.path}
                      element={(
                        <Guard>
                          <PermissionRoute module={mod}>
                            <RouteComponent />
                          </PermissionRoute>
                        </Guard>
                      )}
                    />
                  );
                })}
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
        <PermissionsProvider>
          <AppContent />
        </PermissionsProvider>
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
      if (!isPreviewMode() && window.electronAPI?.authSessionSet) {
        try {
          await window.electronAPI.authSessionSet(adminUser.id, adminUser);
        } catch (e) { /* non-critical */ }
      }
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
          currency: 'TND',
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
          permissions: (userObj.role === 'admin' || userObj.role === 'superadmin') ? ['all'] : userObj.role === 'manager' ? ['sales', 'products', 'customers', 'reports', 'inventory'] : ['sales', 'reports'],
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

  // Enforce license in production (Electron). Preview/browser mode is demo-only.
  if (!isPreviewMode() && !licenseValid) {
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
      <VirtualKeyboard disabled={(!user && !isFirstTime) || isLocked} autoOpen={isFirstTime && !user} />
    </>
  );
}

export default App;
