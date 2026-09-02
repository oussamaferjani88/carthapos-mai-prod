import { useEffect, useState } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LayoutDashboard, Package, Settings, LogOut, User, BarChart3, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import ThemeToggle from "./ThemeToggle";
import LanguageSwitcher from "./LanguageSwitcher";
import { getAuthUser, getAuthClient, clearAuth } from "@/lib/auth";

type PortalUser = {
  id?: string;
  name?: string;
  email?: string;
  companyName?: string;
};

const getStoredUser = (): PortalUser | null => {
  const authUser = getAuthUser();
  const authClient = getAuthClient();
  if (authUser || authClient) {
    return {
      id: authClient?.id || authUser?.id,
      name: authClient?.name || authUser?.username,
      email: authClient?.email || authUser?.email,
      companyName: authClient?.name || undefined,
    };
  }
  return null;
};

const DashboardLayout = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<PortalUser | null>(() => getStoredUser());

  const navigation = [
    {
      name: t('dashboard.nav.dashboard'),
      href: '/dashboard',
      icon: LayoutDashboard
    },
    {
      name: t('dashboard.nav.generator'),
      href: '/pos-generator',
      icon: Package
    },
    {
      name: t('dashboard.nav.projects'),
      href: '/dashboard/projects',
      icon: FolderOpen
    },
    {
      name: t('dashboard.nav.settings'),
      href: '/dashboard/settings',
      icon: Settings
    },
    {
      name: t('dashboard.nav.bi'),
      href: '/dashboard/bi',
      icon: BarChart3
    }
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  // Pages that manage their own full-width canvas.
  const fullBleed =
    location.pathname.startsWith('/pos-generator') ||
    /^\/dashboard\/bi-dashboard\/[^/]+$/.test(location.pathname);

  useEffect(() => {
    const storedUser = getStoredUser();
    if (!storedUser) {
      navigate("/login", { replace: true });
    } else {
      setUser(storedUser);
    }
  }, [navigate]);

  useEffect(() => {
    const handleStorage = () => {
      setUser(getStoredUser());
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const handleLogout = () => {
    clearAuth();
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-[230px] border-r border-border bg-card hidden lg:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="px-3 py-3 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-md bg-primary text-primary-foreground flex items-center justify-center">
                <span className="font-semibold text-base">C</span>
              </div>
              <span className="text-[15px] font-semibold tracking-tight text-foreground">
                CarthaPos
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center gap-2.5 px-2.5 py-1.5 rounded-md transition-colors ${
                  isActive(item.href)
                    ? 'bg-accent font-medium text-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground'
                }`}
              >
                <item.icon className="size-[18px] shrink-0" />
                <span className="truncate text-[13px] leading-tight">{item.name}</span>
              </Link>
            ))}
          </nav>

          {/* User Section */}
          <div className="px-2.5 py-3 border-t border-border space-y-3">
            <div className="flex items-center gap-2.5 px-2.5">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                <User className="size-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate leading-tight">
                  {user?.name || user?.companyName || "Utilisateur"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email || "—"}
                </p>
              </div>
            </div>
            <div className="flex gap-2 px-2.5">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-2.5 text-[13px] text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="size-4" />
              {t('dashboard.nav.logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content — a single centered, width-capped column so every
          section lines up the way "Mon espace BI" does. Full-bleed pages
          (the generator's live preview, an embedded dashboard) opt out. */}
      <div className="flex-1 overflow-y-auto">
        <div className={fullBleed ? "" : "mx-auto max-w-6xl p-6"}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
