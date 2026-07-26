import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingCart, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';

export const POSContent = ({ 
  children,
  className = ''
}) => {
  const mainContentRef = useRef(null);
  const location = useLocation();
  const { config, loading } = useAppConfig();
  const [notification, setNotification] = useState(null);

  // Extract theme configuration (même si loading)
  const theme = config?.theme || {};
  const backgroundColor = theme.backgroundColor || theme.colors?.background || '#ffffff';
  const fontFamily = theme.fontFamily || 'Inter';
  const fontSize = theme.fontSize || '14px';
  const fontWeight = theme.fontWeight || '400';
  const contentMaxWidth = theme.maxWidth || config?.maxWidth || '1200px';
  const compactMode = theme.compactMode || config?.compactMode || false;

  // Reset scroll position when route changes
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  // Auto-dismiss notifications after 3 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Expose notification setter globally for child components
  useEffect(() => {
    window.showNotification = (message, type = 'success') => {
      setNotification({ message, type });
    };
    return () => {
      delete window.showNotification;
    };
  }, []);

  // Si config est en cours de chargement, afficher un loader simple
  if (loading || !config) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Check if current page should have overflow hidden (like sales page)
  const isOverflowHidden = location.pathname === '/sales';

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      case 'info':
        return <Info className="w-4 h-4" />;
      default:
        return <ShoppingCart className="w-4 h-4" />;
    }
  };

  // Get notification colors based on type
  const getNotificationColors = (type) => {
    switch (type) {
      case 'success':
        return 'bg-green-500 text-white';
      case 'error':
        return 'bg-red-500 text-white';
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-800 text-white';
    }
  };

  return (
    <div 
      className={`flex-1 flex flex-col min-w-0 relative h-full ${className}`}
      style={{ 
        position: 'relative', 
        zIndex: 1, 
        minHeight: '100%',
        backgroundColor: backgroundColor
      }}
    >
      {/* Main Content Area */}
      <main 
        ref={mainContentRef}
        className={
          isOverflowHidden 
            ? 'flex-1 overflow-hidden' 
            : 'flex-1 overflow-auto'
        }
        style={{ 
          backgroundColor: backgroundColor,
          minHeight: '100%',
          width: '100%',
          fontFamily: fontFamily + ', system-ui, sans-serif',
          fontSize: fontSize,
          fontWeight: fontWeight
        }}
      >
        {children}
      </main>

      {/* Notification Toast */}
      {notification && (
        <div 
          className={`
            fixed top-4 right-4 z-50 
            px-4 py-3 rounded-lg shadow-lg 
            transform transition-all duration-300 ease-in-out
            ${getNotificationColors(notification.type)}
          `}
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <div className="flex items-center space-x-3">
            {getNotificationIcon(notification.type)}
            <span className="text-sm font-medium">{notification.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};
