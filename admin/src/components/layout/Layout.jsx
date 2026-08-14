import { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Settings,
  Usb,
  BarChart3,
  History,
  Menu,
  X,
  Shield,
  Bell,
  CheckCheck,
  Link2,
  Inbox,
  Search,
  ChevronDown,
  Store,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { cn } from '../../lib/utils';
import { useAccessMode } from '../../contexts/AccessModeContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '../ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import api from '../../lib/api';

function timeAgo(value) {
  if (!value) return '';
  const date = new Date(value);
  if (isNaN(date.getTime())) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days} j`;
  return new Date(value).toLocaleDateString('fr-FR');
}

function AdminBell() {
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadCount = useCallback(async () => {
    try {
      const res = await api.get('/bi/notifications/admin/unread-count');
      setUnread(typeof res.data?.data?.count === 'number' ? res.data.data.count : 0);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 30000);
    return () => clearInterval(interval);
  }, [loadCount]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await api.get('/bi/notifications/admin', { params: { pageSize: 10 } });
      setItems(res.data?.data?.items || []);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  };

  const onOpenChange = (next) => {
    setOpen(next);
    if (next) loadList();
  };

  const markRead = async (notificationId) => {
    try {
      await api.patch(`/bi/notifications/${notificationId}/read`);
      setItems((prev) => prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n)));
      loadCount();
    } catch { /* ignore */ }
  };

  const markAllRead = async () => {
    try {
      await api.post('/bi/notifications/read-all', { role: 'ADMIN' });
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnread(0);
    } catch { /* ignore */ }
  };

  const openNotification = async (n) => {
    await markRead(n.id);
    setOpen(false);
    if (n.dashboardId) {
      navigate(`/bi-dashboard/${n.dashboardId}`);
    } else if (n.requestId) {
      navigate(`/bi-requests/${n.requestId}`);
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-8 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white"
        >
          <Bell className="size-[18px]" />
          {unread > 0 && (
            <span className="absolute top-0.5 right-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[#d82c0d] px-1 text-[9px] font-semibold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <span className="text-sm font-semibold">Notifications BI</span>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="gap-1 h-7 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5" /> Tout lire
            </Button>
          )}
        </div>
        {loading ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">Chargement...</div>
        ) : items.length === 0 ? (
          <div className="px-3 py-4 text-sm text-muted-foreground">Aucune notification.</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              className="flex items-start gap-2 px-3 py-2 cursor-pointer whitespace-normal"
              onClick={() => openNotification(n)}
            >
              <span className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${n.isRead ? 'bg-muted-foreground/30' : 'bg-[#202223]'}`} />
              <span className="min-w-0">
                <span className="block text-sm font-medium truncate">{n.title}</span>
                <span className="block text-xs text-muted-foreground line-clamp-2">{n.message}</span>
                <span className="block text-[11px] text-muted-foreground/70 mt-0.5">
                  {timeAgo(n.createdAt)}
                </span>
              </span>
            </DropdownMenuItem>
          ))
        )}
        <Link to="/bi-requests" onClick={() => setOpen(false)}>
          <div className="border-t border-border/60 px-3 py-2 text-sm text-primary hover:underline">
            Voir toutes les demandes BI
          </div>
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const navigationGroups = [
  {
    label: 'Général',
    items: [
      { name: 'Tableau de bord', href: '/', icon: LayoutDashboard, userAccess: true },
      { name: 'Clients', href: '/clients', icon: Users, userAccess: false },
      { name: 'Licences', href: '/licenses', icon: FileText, userAccess: false },
      { name: 'Modules', href: '/modules', icon: Package, userAccess: false },
    ],
  },
  {
    label: 'POS',
    items: [
      { name: 'Générateur POS', href: '/pos-generator', icon: Settings, userAccess: true },
    ],
  },
  {
    label: 'BI Analytics',
    items: [
      { name: 'Demandes BI', href: '/bi-requests', icon: BarChart3, userAccess: false },
      { name: 'Assignations', href: '/bi-assignments', icon: Link2, userAccess: false },
      { name: 'Notifications', href: '/bi-notifications', icon: Inbox, userAccess: false },
      { name: 'Import BI', href: '/bi-wizard', icon: Settings, userAccess: false },
      { name: 'Historique BI', href: '/bi-upload-portal', icon: History, userAccess: false },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'Gestion Utilisateurs', href: '/user-management', icon: Shield, userAccess: false },
      { name: 'Gestion USB', href: '/usb-manager', icon: Usb, userAccess: false },
    ],
  },
];

function NavLinks({ item, collapsed, active, onNavigate }) {
  const link = (
    <Link
      to={item.href}
      onClick={onNavigate}
      className={cn(
        'group flex items-center rounded-md transition-colors',
        collapsed ? 'justify-center px-0 py-2' : 'px-2.5 py-1.5 gap-2.5',
        active
          ? 'bg-accent font-medium text-foreground'
          : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
      )}
    >
      <item.icon className={cn('shrink-0', collapsed ? 'size-[18px]' : 'size-[18px]', active ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground')} />
      {!collapsed && <span className="truncate text-[13px] leading-tight">{item.name}</span>}
    </Link>
  );

  if (!collapsed) return link;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.name}</TooltipContent>
    </Tooltip>
  );
}

function NavGroups({ groups, location, collapsed, onNavigate }) {
  return (
    <nav className={cn('flex-1 overflow-y-auto py-3', collapsed ? 'px-2' : 'px-2.5')}>
      {groups.map((group, gi) => (
        <div key={group.label} className={gi > 0 ? 'mt-5' : ''}>
          {!collapsed && (
            <p className="mb-1 px-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
          )}
          <ul className={cn('space-y-0.5', collapsed && 'space-y-1')}>
            {group.items.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <li key={item.name}>
                  <NavLinks item={item} collapsed={collapsed} active={isActive} onNavigate={onNavigate} />
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { isUserMode, currentUserProfile } = useAccessMode();

  const isInIframe = window.self !== window.top;

  const groups = isUserMode
    ? navigationGroups
        .map((g) => ({ ...g, items: g.items.filter((item) => item.userAccess) }))
        .filter((g) => g.items.length > 0)
    : navigationGroups;

  // If in user mode AND in iframe, hide chrome completely
  if (isUserMode && isInIframe) {
    return (
      <div className="h-screen bg-background">
        <main className="h-full overflow-y-auto">{children}</main>
      </div>
    );
  }

  const sidebarContent = (
    <NavGroups groups={groups} location={location} collapsed={collapsed} onNavigate={() => setMobileOpen(false)} />
  );

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {/* ================= TOP BAR ================= */}
        <header className="z-30 flex h-14 flex-shrink-0 items-center gap-2 bg-[var(--topbar)] px-3 text-white sm:gap-3 sm:px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCollapsed((c) => !c)}
            className="hidden text-white/80 hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label={collapsed ? 'Étendre le menu' : 'Réduire le menu'}
          >
            <Menu className="size-[18px]" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Ouvrir le menu"
          >
            <Menu className="size-[18px]" />
          </Button>

          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-md bg-white text-[13px] font-black text-[var(--topbar)]">
              C
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-white">CarthaPOS</span>
            {isUserMode && (
              <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white/90">
                Utilisateur
              </span>
            )}
          </Link>

          <div className="relative mx-auto hidden w-full max-w-md md:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-white/40" />
            <Input
              className="h-8 border-none bg-white/10 pl-9 text-sm text-white placeholder:text-white/40 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:ring-transparent"
              placeholder="Rechercher..."
            />
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <AdminBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-md px-2 py-1 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#5c6ac4] to-[#47c1bf] text-[11px] font-semibold text-white">
                    {(currentUserProfile?.name || 'A').charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-[13px] font-medium sm:block">
                    {currentUserProfile?.name || 'Admin'}
                  </span>
                  <ChevronDown className="size-3.5 text-white/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center gap-2">
                  <Store className="size-4 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate">{currentUserProfile?.name || 'Administrateur'}</span>
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      {currentUserProfile?.email || 'carthapos@admin'}
                    </span>
                  </span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <a href="https://carthapos-frontend.onrender.com" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" /> Consulter la partie client
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href="/?mode=user" rel="noopener noreferrer">
                    <Users className="size-4" /> Mode utilisateur
                  </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 focus:text-red-600">
                  <LogOut className="size-4" /> Se déconnecter
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* ================= SIDEBAR + CONTENT ================= */}
        <div className="flex min-h-0 flex-1">
          {/* Desktop sidebar */}
          <aside
            className={cn(
              'hidden flex-shrink-0 flex-col border-r border-border bg-card transition-[width] duration-200 ease-in-out lg:flex',
              collapsed ? 'w-[60px]' : 'w-[230px]',
            )}
          >
            {sidebarContent}
          </aside>

          {/* Mobile sidebar overlay */}
          {mobileOpen && (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
              <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
                <div className="flex h-14 flex-shrink-0 items-center justify-between border-b border-border px-4">
                  <span className="text-[15px] font-semibold text-foreground">CarthaPOS</span>
                  <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)} aria-label="Fermer le menu">
                    <X className="size-[18px]" />
                  </Button>
                </div>
                <NavGroups groups={groups} location={location} collapsed={false} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          )}

          {/* Main content */}
          <main className="min-w-0 flex-1 overflow-y-auto bg-background p-4 sm:p-5 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
