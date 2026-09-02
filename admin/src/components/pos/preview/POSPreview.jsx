import React, { useState } from 'react';
import { useDragDrop } from '../../../contexts/DragDropContext';
import { POSNavbar } from './POSNavbar';
import { POSContent } from './POSContent';
import { POSHeader } from './POSHeader';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { cn } from '../../../lib/utils';
import { Shield } from 'lucide-react';

// Miroir de la coquille du POS réel (pos-template/components/Layout.jsx) :
//   ┌──────────────────────────────────────────────┐
//   │ POS HEADER                                   │
//   ├────────┬─────────────────────────────────────┤
//   │ NAV    │             ACTIVE PAGE            │
//   │ BAR    │                                    │
//   ├────────┴─────────────────────────────────────┤
//   │ POS FOOTER / STATUS                         │
//   └──────────────────────────────────────────────┘
const POSPreview = ({
  configuration = {},
  modules = [],
  navbarPosition = 'left',
  isDragMode = false,
  onComponentSelect,
}) => {
  const { componentLayout } = useDragDrop();
  const [activePage, setActivePage] = useState('dashboard');
  const [notification, setNotification] = useState(null);

  // Création de la configuration avec valeurs par défaut - priorise la configuration
  const config = POSConfiguration.createConfig({
    navbarPosition: navbarPosition, // Fallback si pas dans configuration
    isPreviewMode: true,
    // Utilisateur démo pour refléter le header du POS réel (nom + rôle)
    currentUser: configuration.currentUser || { name: 'Admin Principal', role: 'admin' },
    onLogout: configuration.onLogout || (() => {}),
    ...configuration,
  });
  const styles = POSConfiguration.getStyles(config);
  const animationClasses = POSConfiguration.getAnimationClasses(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);

  // Filtre les modules selon le rôle simulé (admin = tout)
  const getFilteredModules = () => {
    const role = config.currentUser?.role || 'admin';
    if (role === 'admin') return [...modules, 'user-management', 'hardware-settings'];
    const roleModules = {
      manager: [...modules, 'user-management'],
      cashier: [...modules, 'products', 'customers'],
    };
    return [...new Set([...(roleModules[role] || modules), 'dashboard', 'sales'])];
  };

  const filteredModules = getFilteredModules();

  // Vérifie si un composant est visible
  const isVisible = (componentId) => {
    const layoutConfig = componentLayout[componentId];
    return layoutConfig ? layoutConfig.visible !== false : true;
  };

  // Toujours flex-row pour left/right (le placement est géré par l'ordre des
  // enfants). Flex-col uniquement pour top (navbar en haut, contenu en bas).
  const isTopNav = config.navbarPosition === 'top';

  return (
    <div
      className={cn(
        'pos-preview h-full w-full flex overflow-hidden',
        isTopNav ? 'flex-col' : 'flex-row',
        animationTypeClass,
        animationSpeedClass,
        config.glassEffect ? 'pos-glass-effect' : '',
        config.gradientBackgrounds ? 'pos-gradient-subtle' : '',
        `pos-shadow-${config.shadowIntensity || 'medium'}`,
        animationClasses
      )}
      data-btn-style={config.components?.buttons?.style || 'default'}
      data-input-style={config.components?.forms?.inputStyle || 'default'}
      style={{
        fontFamily: `"${config.fontFamily}", sans-serif`,
        backgroundColor: config.backgroundColor,
        color: config.textColor,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        ...POSConfiguration.getStyleVars(config),
        ...POSConfiguration.getShadcnThemeVars(config),
        transition: config.animations ? 'all 0.2s ease-in-out' : 'none'
      }}
    >
      <POSNavbar
        config={config}
        activePage={activePage}
        setActivePage={setActivePage}
        modules={filteredModules}
        isDragMode={isDragMode}
        onComponentSelect={onComponentSelect}
        isVisible={isVisible}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <POSHeader config={config} />

        <POSContent
          config={config}
          activePage={activePage}
          modules={filteredModules}
          notification={notification}
          setNotification={setNotification}
          isDragMode={isDragMode}
        />

        <footer
          className="border-t px-4 py-2 flex-shrink-0"
          style={{
            borderColor: config.cardBorderColor || '#e5e7eb',
            backgroundColor: config.cardBackgroundColor || config.backgroundColor || '#ffffff',
            color: config.textMutedColor || '#6b7280',
            transition: styles.animation,
          }}
        >
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-4">
              <Shield className="w-3 h-3" />
              <span>{config.footerText || `Powered by ${config.businessName || 'POS System'}`}</span>
              <span>•</span>
              <span>Version 2.1.0</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>
                {new Date().toLocaleTimeString(config.language === 'fr' ? 'fr-FR' : 'en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
              <div className="flex items-center space-x-1">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>En ligne</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default POSPreview;
