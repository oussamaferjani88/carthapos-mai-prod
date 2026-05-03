import React from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppConfig } from '../hooks/useAppConfig';

export const POSHeader = ({ 
  onMobileMenuToggle,
  className = ''
}) => {
  const { user, logout } = useAuth();
  const { config, loading } = useAppConfig();

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
  const navbarPosition = config?.layout?.navbarPosition || 'left';

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
        fontFamily: fontFamily + ', system-ui, sans-serif'
      }}
    >
      <div className="flex items-center justify-between px-6 py-3">
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

        {/* Section droite - User info et logout */}
        {user && (
          <div className="flex items-center space-x-4">
            {/* Avatar et infos user */}
            <div className="flex items-center space-x-3">
              <div 
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                style={{ backgroundColor: primaryColor }}
              >
                {user.fullName?.charAt(0) || user.username?.charAt(0) || 'U'}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium" style={{ color: textColor }}>
                  {user.fullName || user.username}
                </p>
                <p className="text-xs" style={{ color: textMutedColor }}>
                  {user.role || 'Utilisateur'}
                </p>
              </div>
            </div>

            {/* Bouton logout */}
            <button
              onClick={logout}
              className="p-2 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-600 transition-colors"
              title="Se déconnecter"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
