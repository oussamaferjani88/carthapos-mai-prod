import React, { useState, useEffect } from 'react';
import { useDragDrop } from '../../../contexts/DragDropContext';
import { POSNavbar } from './POSNavbar';
import { POSContent } from './POSContent';
import { POSHeader } from './POSHeader';
import { POSConfiguration } from '../../../config/POSConfiguration';
import { cn } from '../../../lib/utils';

const POSPreview = ({ 
  configuration = {},
  modules = [],
  navbarPosition = 'left',
  isDragMode = false,
  onComponentSelect 
}) => {
  const { componentLayout } = useDragDrop();
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const [activePage, setActivePage] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  
  // User role simulation for preview
  const [currentUserRole, setCurrentUserRole] = useState('admin'); // 'admin' or 'cashier'
  const [cashierModules, setCashierModules] = useState(['dashboard', 'sales', 'customers']); // Modules affectés par l'admin

  // Create configuration with defaults - prioriser la configuration
  const config = POSConfiguration.createConfig({
    navbarPosition: navbarPosition, // Fallback si pas dans configuration
    isPreviewMode: true, // Enable preview mode features like role switcher
    ...configuration // La configuration override la prop
  });
  const styles = POSConfiguration.getStyles(config);
  const glassEffect = POSConfiguration.getGlassEffect(config);
  const animationClasses = POSConfiguration.getAnimationClasses(config);
  const animationTypeClass = POSConfiguration.getAnimationTypeClass(config);
  const animationSpeedClass = POSConfiguration.getAnimationSpeedClass(config);
  const layoutClasses = POSConfiguration.getLayoutClasses(config);

  // Check if component is visible
  const isVisible = (componentId) => {
    const layoutConfig = componentLayout[componentId];
    return layoutConfig ? layoutConfig.visible !== false : true;
  };
  
  // Filter modules based on user role
  const getFilteredModules = () => {
    if (currentUserRole === 'admin') {
      return [...modules, 'user-management'];
    } else {
      const baseModules = ['dashboard', 'sales'];
      return [...new Set([...baseModules, ...cashierModules])];
    }
  };
  
  const filteredModules = getFilteredModules();

  // Resolve navbar width from config
  const navbarWidth = config.navbarWidth || '64px';

  return (
    <div 
      className={cn(
        "pos-preview h-full w-full bg-background overflow-hidden",
        animationTypeClass,
        animationSpeedClass,
        config.glassEffect ? "pos-glass-effect" : "",
        config.gradientBackgrounds ? "pos-gradient-subtle" : "",
        `pos-shadow-${config.shadowIntensity || 'medium'}`,
        animationClasses
      )}
      style={{ 
        maxHeight: '100%', 
        maxWidth: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
        ...POSConfiguration.getStyleVars(config),
        ...styles.container,
        fontFamily: config.fontFamily,
        fontSize: config.fontSize,
        fontWeight: config.fontWeight,
        transition: config.animations ? 'all 0.2s ease-in-out' : 'none'
      }}
    >
      <div 
        className={cn(
          "flex-1 w-full flex",
          config.navbarPosition === 'top' ? 'flex-col' :
          config.navbarPosition === 'right' ? 'flex-row-reverse' : 'flex-row',
          animationTypeClass,
          animationSpeedClass,
          `pos-shadow-${config.shadowIntensity || 'medium'}`,
          animationClasses
        )}
        style={{ 
          position: 'relative', 
          maxHeight: '100%', 
          maxWidth: config.maxWidth !== '100%' ? config.maxWidth : '100%',
          height: '100%',
          margin: '0 auto',
          padding: 0,
          boxSizing: 'border-box',
          transition: styles.animation
        }}
      >
        {/* Navbar */}
        <POSNavbar
          config={config}
          isNavbarCollapsed={isNavbarCollapsed}
          setIsNavbarCollapsed={setIsNavbarCollapsed}
          activePage={activePage}
          setActivePage={setActivePage}
          modules={filteredModules}
          isDragMode={isDragMode}
          onComponentSelect={onComponentSelect}
          isVisible={isVisible}
          currentUserRole={currentUserRole}
        />

        {/* Main Content avec Header */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header (top bar) */}
          <POSHeader
            config={config}
            isNavbarCollapsed={isNavbarCollapsed}
            setIsNavbarCollapsed={setIsNavbarCollapsed}
          />

          {/* Content */}
          <POSContent
            config={config}
            activePage={activePage}
            modules={filteredModules}
            notification={notification}
            setNotification={setNotification}
            isDragMode={isDragMode}
            onComponentSelect={onComponentSelect}
            isVisible={isVisible}
            currentUserRole={currentUserRole}
          />
        </div>
      </div>
    </div>
  );
};

export default POSPreview;
