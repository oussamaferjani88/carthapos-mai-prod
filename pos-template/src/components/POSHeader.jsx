import React, { useState, useRef, useEffect } from 'react';
import { Menu, LogOut, ChevronDown, UserCheck, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../hooks/useAppConfig';

export const POSHeader = ({ 
  onMobileMenuToggle,
  className = ''
}) => {
  const { user, logout } = useAuth();
  const { config, loading } = useAppConfig();
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  };

  const ROLE_BADGE = {
    superadmin: 'bg-purple-500/10 text-purple-600',
    admin: 'bg-red-500/10 text-red-600',
    manager: 'bg-orange-500/10 text-orange-600',
    cashier: 'bg-emerald-500/10 text-emerald-600',
    server: 'bg-teal-500/10 text-teal-600',
  };

  const ROLE_LABEL = {
    superadmin: 'Super admin',
    admin: 'Administrateur',
    manager: 'Manager',
    cashier: 'Caissier',
    server: 'Serveur',
  };

  // Extract theme configuration (même si loading)
  const theme = config?.theme || {};
  const primaryColor = theme.primaryColor || theme.colors?.primary || '#3b82f6';
  const backgroundColor = theme.backgroundColor || theme.colors?.background || '#ffffff';
  const textColor = theme.textColor || theme.colors?.text || '#1f2937';
  const textMutedColor = theme.textMutedColor || '#6b7280';
  const cardBackgroundColor = backgroundColor;
  const cardBorderColor = '#e5e7eb';
  const businessName = theme.businessName || 'POS System';
  const businessLogo = theme.logo || null;
  const fontFamily = theme.fontFamily || 'Inter';
  const navbarPosition = config?.layout?.navbarPosition || theme.navbarPosition || 'left';
  const navbarHeight = theme.navbarHeight || '48px';

  // Si config est en cours de chargement, ne rien afficher
  if (loading || !config) {
    return null;
  }

  // Seulement affiché quand la navbar est en mode sidebar (pas top)
  if (navbarPosition === 'top') {
    return null;
  }

  // Format date longue en français
  const formatLongDate = () => {
    return new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <header 
      className={`border-b ${className}`}
      style={{ 
        backgroundColor: cardBackgroundColor,
        borderColor: cardBorderColor,
        fontFamily: fontFamily + ', system-ui, sans-serif',
        height: navbarHeight
      }}
    >
      <div className="flex items-center justify-between px-6 py-1 h-full">
        {/* Left side - Logo et nom business */}
        <div className="flex items-center space-x-3">
          {/* Mobile menu button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={onMobileMenuToggle}
          >
            <Menu className="w-5 h-5" />
          </button>
          
          {/* Logo et nom */}
          <div className="flex items-center space-x-3">
            {/* Logo - affiche toujours une image */}
            <img 
              src={businessLogo || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzNiODJmNiIvPgo8cGF0aCBkPSJNOCAxMmg4djhoLTh2LTh6TTEyIDhoOHY4aC04di04eiIgZmlsbD0id2hpdGUiLz4KPHN2Zz4='} 
              alt={businessName} 
              className="w-8 h-8 rounded-lg object-cover border shadow-sm"
              style={{ borderColor: cardBorderColor }}
              onError={(e) => {
                // Fallback si l'image ne charge pas
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiByeD0iOCIgZmlsbD0iIzNiODJmNiIvPgo8cGF0aCBkPSJNOCAxMmg4djhoLTh2LTh6TTEyIDhoOHY4aC04di04eiIgZmlsbD0id2hpdGUiLz4KPHN2Zz4=';
              }}
            />
            
            {/* Nom du business */}
            <h1 
              className="text-lg font-bold"
              style={{ color: textColor }}
            >
              {businessName}
            </h1>
          </div>
        </div>

        {/* Section centrale - Badges système */}
        <div className="hidden md:flex items-center space-x-4">
          {/* Date longue */}
          <div 
            className="text-sm px-3 py-1.5 rounded-full"
            style={{ 
              backgroundColor: textMutedColor ? `${textMutedColor}20` : '#94a3b820',
              color: textMutedColor
            }}
          >
            📅 {formatLongDate()}
          </div>
          
          {/* Statut système */}
          <div className="text-sm bg-green-500/10 text-green-700 px-3 py-1.5 rounded-full font-medium">
            🟢 Système en ligne
          </div>
        </div>

        {/* Section droite - User info et menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center space-x-3 p-1.5 rounded-xl hover:bg-muted/40 transition-all"
            >
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: primaryColor }}
                >
                  {getInitials(user.fullName || user.full_name)}
                </div>
              )}
              <div className="hidden md:block text-left">
                <p className="text-sm font-medium" style={{ color: textColor }}>
                  {user.fullName || user.full_name || user.username}
                </p>
                <p className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-block ${ROLE_BADGE[user.role] || 'bg-muted text-muted-foreground'}`}>
                  {ROLE_LABEL[user.role] || user.role}
                </p>
              </div>
              <ChevronDown size={14} className={`text-muted-foreground transition-transform ${showMenu ? 'rotate-180' : ''}`} />
            </button>

            {showMenu && (
              <div className="absolute right-0 top-full mt-2 w-56 bg-card border border-border/50 rounded-xl shadow-xl shadow-black/5 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2 border-b border-border/30">
                  <p className="text-sm font-semibold">{user.fullName || user.full_name || user.username}</p>
                  <p className="text-[11px] text-muted-foreground">{user.email || user.username}</p>
                </div>
                <button
                  onClick={() => { setShowMenu(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                >
                  <UserCheck size={15} />
                  Changer d'utilisateur
                </button>
                <button
                  onClick={() => { setShowMenu(false); logout(); }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm text-destructive hover:bg-destructive/5 transition-colors"
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
