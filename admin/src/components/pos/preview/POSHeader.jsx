import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, UserCheck } from 'lucide-react';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { cn } from '../../../lib/utils';

// Miroir de pos-template/components/POSHeader.jsx : logo + nom du commerce,
// badges système (date + "Système en ligne") et bloc utilisateur (avatar,
// nom, badge de rôle, menu déroulant). Données démo car pas de runtime.
export const POSHeader = ({ config, onMobileMenuToggle }) => {
  const styles = POSConfiguration.getStyles(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Seulement affiché quand la navbar est en mode sidebar (pas top)
  if (config.navbarPosition === 'top') {
    return null;
  }

  const user = config.currentUser;
  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const ROLE_BADGE = {
    admin: 'bg-red-500/10 text-red-600',
    manager: 'bg-orange-500/10 text-orange-600',
    cashier: 'bg-emerald-500/10 text-emerald-600',
    server: 'bg-teal-500/10 text-teal-600',
  };

  const primaryColor = config.primaryColor || '#3b82f6';
  const textColor = config.textColor || '#1f2937';
  const textMutedColor = config.textMutedColor || '#6b7280';
  const businessName = config.businessName || 'POS System';
  const businessLogo = config.logo || config.businessLogo || null;
  const fontFamily = config.fontFamily || 'Inter';
  const navbarHeight = config.navbarHeight || '48px';

  const formatLongDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const defaultLogo = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzNiODJmNiIvPgo8cGF0aCBkPSJNOCAxMmg4djhoLTh2LTh6TTEyIDhoOHY4aC04di04eiIgZmlsbD0id2hpdGUiLz4KPHN2Zz4=';

  return (
    <header
      className={cn('border-b flex-shrink-0', animationTypeClass, animationSpeedClass)}
      style={{
        backgroundColor: config.backgroundColor,
        borderColor: config.cardBorderColor || '#e5e7eb',
        fontFamily: fontFamily + ', system-ui, sans-serif',
        height: navbarHeight,
        transition: styles.animation,
      }}
    >
      <div className="flex items-center justify-between px-6 py-1 h-full">
        {/* Partie gauche - logo et nom du commerce */}
        <div className="flex items-center space-x-3">
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3">
            <img
              src={businessLogo || defaultLogo}
              alt={businessName}
              className="w-8 h-8 rounded-lg object-cover border shadow-sm"
              style={{ borderColor: config.cardBorderColor || '#e5e7eb' }}
              onError={(e) => { e.target.src = defaultLogo; }}
            />
            <h1 className="text-lg font-bold" style={{ color: textColor }}>
              {businessName}
            </h1>
          </div>
        </div>

        {/* Section centrale - badges système */}
        <div className="hidden md:flex items-center space-x-4">
          <div
            className="text-sm px-3 py-1.5 rounded-full"
            style={{
              backgroundColor: textMutedColor ? `${textMutedColor}20` : '#94a3b820',
              color: textMutedColor,
            }}
          >
            📅 {formatLongDate()}
          </div>
          <div className="text-sm bg-green-500/10 text-green-700 px-3 py-1.5 rounded-full font-medium">
            🟢 Système en ligne
          </div>
        </div>

        {/* Section droite - info utilisateur et menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-muted/40 transition-all"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                style={{ backgroundColor: primaryColor }}
              >
                {getInitials(user.name || user.fullName || user.username)}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium" style={{ color: textColor }}>
                  {user.name || user.fullName || user.username || 'Admin Principal'}
                </p>
                <p className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block ${ROLE_BADGE[user.role] || 'bg-muted text-muted-foreground'}`}>
                  {user.role || 'admin'}
                </p>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-border/50 rounded-xl shadow-xl shadow-black/5 py-1.5 z-50">
                <div className="px-3 py-2 border-b border-border/30">
                  <p className="text-sm font-semibold">{user.name || user.fullName || user.username}</p>
                  <p className="text-[11px] text-muted-foreground">{user.email || user.username || 'admin@pos.demo'}</p>
                </div>
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <UserCheck size={15} />
                  Changer d'utilisateur
                </button>
                <button
                  onClick={() => { setShowMenu(false); config.onLogout?.(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Se déconnecter
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default POSHeader;
