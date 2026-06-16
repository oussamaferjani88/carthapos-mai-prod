import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  Package, 
  Settings, 
  Usb,
  BarChart3,
  Upload,
  Menu,
  X,
  Shield,
  Search,
  CheckSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import { useAccessMode } from '../../contexts/AccessModeContext';

const allNavigation = [
  { name: 'Tableau de bord', href: '/', icon: LayoutDashboard, userAccess: true },
  { name: 'Clients', href: '/clients', icon: Users, userAccess: false },
  { name: 'Licences', href: '/licenses', icon: FileText, userAccess: false },
  { name: 'Modules', href: '/modules', icon: Package, userAccess: false },
  { name: 'Générateur POS', href: '/pos-generator', icon: Settings, userAccess: true },
  { name: 'Demandes BI', href: '/bi-requests', icon: BarChart3, userAccess: false },
  { name: 'Portail BI', href: '/bi-upload-portal', icon: Upload, userAccess: false },
  { name: 'Tableaux de bord BI', href: '/bi-dashboard-manager', icon: BarChart3, userAccess: false },
  { name: 'Analyse BI', href: '/bi-analysis', icon: Search, userAccess: false },
  { name: 'Validation BI', href: '/bi-review', icon: CheckSquare, userAccess: false },
  { name: 'Gestion Utilisateurs', href: '/user-management', icon: Shield, userAccess: false },
  { name: 'Gestion USB', href: '/usb-manager', icon: Usb, userAccess: false },
];

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(true); // true par défaut
  const location = useLocation();
  const { isUserMode, isAdminMode } = useAccessMode();
  
  // Check if running in iframe
  const isInIframe = window.self !== window.top;
  
  // Filter navigation based on access mode
  const navigation = isUserMode 
    ? allNavigation.filter(item => item.userAccess)
    : allNavigation;

  // If in user mode AND in iframe, hide the sidebar completely
  if (isUserMode && isInIframe) {
    return (
      <div className="min-h-screen bg-background">
        <main className="h-screen overflow-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar - Always visible on desktop, overlay on mobile */}
      <div className={cn(
        "w-64 bg-card border-r border-border flex-shrink-0 transition-all duration-300",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-border">
          <div>
            <h1 className="text-xl font-bold text-foreground">CarthaPOS</h1>
            {isUserMode && (
              <span className="text-xs text-muted-foreground">Mode Utilisateur</span>
            )}
          </div>
        </div>
        
        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={cn(
                      "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:hidden">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <div>
              <h1 className="text-xl font-bold text-foreground">CarthaPOS</h1>
              {isUserMode && (
                <span className="text-xs text-muted-foreground">Mode Utilisateur</span>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          
          <nav className="mt-6 px-3">
            <ul className="space-y-1">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <li key={item.name}>
                    <Link
                      to={item.href}
                      className={cn(
                        "flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      )}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              
              <span className="text-sm text-muted-foreground">
                Système de génération POS
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-muted-foreground">
                <a 
                  href="https://carthapos-frontend.onrender.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Consulter la partie client
                </a>
                <span className="ml-2 text-xs">
                  (Test: test@carthapos.com / test12345678)
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

