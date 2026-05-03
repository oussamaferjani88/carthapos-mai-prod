import { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import './styles/pos-animations.css';

// Configuration
import { POSConfiguration } from './lib/POSConfiguration';

// Components
import LicenseCheck from './components/LicenseCheck';
import POSWithAuth from './components/POSWithAuth';
import SetupWizard from './components/SetupWizard';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Products from './pages/Products';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import Tables from './pages/Tables';
import Kitchen from './pages/Kitchen';
import Appointments from './pages/Appointments';
import Services from './pages/Services';
import Suppliers from './pages/Suppliers';
import Inventory from './pages/Inventory';
import Barcode from './pages/Barcode';
import QuickService from './pages/QuickService';
import UserAdmin from './pages/UserAdmin';
import MenuManagement from './pages/MenuManagement';
import Takeaway from './pages/Takeaway';
import Loyalty from './pages/Loyalty';
import PaymentAdvanced from './pages/PaymentAdvanced';
import GiftCards from './pages/GiftCards';
import Prescription from './pages/Prescription';
import Production from './pages/Production';
import HardwareSettings from './pages/HardwareSettings';
import ReceiptDesigner from './pages/ReceiptDesigner';

// Hooks
import { useAppConfig } from './hooks/useAppConfig';
import { useLicense } from './hooks/useLicense';

// Contexts

import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import { isPreviewMode } from './utils/environment';

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { config, loading: configLoading } = useAppConfig();
  const { license, isValid: licenseValid, loading: licenseLoading } = useLicense();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isFirstTime, setIsFirstTime] = useState(false);
  // Removed dedicated state for needsAdminReset to avoid unused var; we derive isFirstTime directly
  const [checkingSetup, setCheckingSetup] = useState(!isPreviewMode()); // Only check in production
  const { user, loading: authLoading, setUserDirectly } = useAuth(); // Use setUserDirectly for auto-login

  // Check if first-time setup is needed (production mode only)
  useEffect(() => {
    if (!isPreviewMode()) {
      checkFirstTimeSetup();
    } else {
      setCheckingSetup(false);
    }
  }, []);

  // Listen for database location message from main process (for debugging)
  useEffect(() => {
    try {
      if (window.electronAPI && window.electronAPI.onDatabaseLocation) {
        window.electronAPI.onDatabaseLocation((dbPath) => {
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📊 DATABASE LOCATION INFORMATION (from main process)');
          console.log('═══════════════════════════════════════════════════════════');
          console.log('📁 Full Database Path:', dbPath);
          
          // Extract database name and folder from the full path
          if (dbPath) {
            const pathParts = dbPath.split('\\'); // Windows path separator
            const dbFileName = pathParts[pathParts.length - 1]; // e.g., "slm.db"
            const dbFolder = pathParts.slice(0, -1).join('\\'); // e.g., "D:\Apps\POS\data"
            
            console.log('📝 Database Name:', dbFileName);
            console.log('📂 Database Folder:', dbFolder);
            console.log('═══════════════════════════════════════════════════════════');
          } else {
            console.log('⚠️  Database path not available');
            console.log('═══════════════════════════════════════════════════════════');
          }
        });
      }
    } catch (err) {
      console.error('❌ Error setting up database location listener:', err);
    }
  }, []);

  const checkFirstTimeSetup = async () => {
    try {
      if (window.electronAPI) {
        console.log('🔍 Checking if first-time setup is needed...');
        const needsSetup = await window.electronAPI.needsFirstTimeSetup();
        console.log('🔍 First-time setup needed:', needsSetup);

        // Additionally detect if existing admin still uses default demo password
  const needsReset = await window.electronAPI.needsAdminPasswordReset();
  console.log('🔐 Admin default password detected (requires reset):', needsReset);

        // Show setup wizard either if no admin exists OR default password detected
        setIsFirstTime(needsSetup || needsReset);
      }
    } catch (error) {
      console.error('❌ Failed to check setup status:', error);
      setIsFirstTime(false);
    } finally {
      setCheckingSetup(false);
    }
  };

  // Auto-login handler after first-time setup
  const handleSetupComplete = async (adminUser) => {
    console.log('✅ Setup completed, auto-logging in admin user...', adminUser);
    
    // Auto-login: Set user in AuthContext directly (already saved to localStorage in SetupWizard)
    if (adminUser && setUserDirectly) {
      setUserDirectly(adminUser); // This will trigger AuthContext to update
    }
    
    // Close first-time setup
    setIsFirstTime(false);
  };

  // Phase 4: Global CSS Variables - Apply POSConfiguration theme globally
  useEffect(() => {
    if (config) {
      console.log('[POS DEBUG] [App] Applying global theme configuration:', config);
      
      const getThemeConfig = () => {
        // Priority 1: Use Electron configuration if available
        if (config.theme) {
          return POSConfiguration.createConfig(config.theme);
        }
        
        // Priority 2: Try to get theme from window (real-time preview)
        if (typeof window !== 'undefined' && window.themeConfig) {
          return POSConfiguration.createConfig(window.themeConfig);
        }
        
        // Priority 3: Fallback to default configuration
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
      
      // Apply CSS variables to document root
      const root = document.documentElement;
      Object.entries(styleVars).forEach(([property, value]) => {
        root.style.setProperty(property, value);
      });

      console.log('[POS DEBUG] [App] Applied CSS variables:', styleVars);
    }
  }, [config]);

  useEffect(() => {
    if (!configLoading && !licenseLoading && !authLoading && !checkingSetup) {
      setIsInitialized(true);
    }
  }, [configLoading, licenseLoading, authLoading, checkingSetup]);

  // Show first-time setup wizard (production mode only)
  if (!isPreviewMode() && isFirstTime && !checkingSetup) {
    console.log('🆕 Showing first-time setup wizard');
    return (
      <SetupWizard 
        onComplete={handleSetupComplete}
      />
    );
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

  const MainPOSApp = () => (
    <Router>
      <div className="pos-app pos-application min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
        <Layout config={config} license={license}>
          <main className="transition-all duration-300 ease-in-out">
            <Routes>
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
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
              <Route path="/user-admin" element={<ProtectedRoute><UserAdmin /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </Layout>
      </div>
    </Router>
  );

  return !user ? (
    <POSWithAuth config={config} />
  ) : (
    <MainPOSApp />
  );
}

export default App;
