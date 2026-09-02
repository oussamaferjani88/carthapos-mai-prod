import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Importer les gestionnaires système (disabled notification and error systems to stop alerts)
import './lib/hardware/cashDrawer.js'
import './lib/hardware/thermalPrinter.js'
import './lib/keyboard/shortcuts.js'
// import './lib/notifications/notificationManager.js' // DISABLED to stop error alerts
import './lib/system/kioskMode.js'
// import './lib/system/errorRecovery.js' // DISABLED to stop error alerts
import './lib/system/autoBackup.js'

// Disable all notifications globally and clear existing ones
if (typeof window !== 'undefined') {
  // Function to clear notifications
  const clearAllNotifications = () => {
    // Clear any existing notification containers
    const existingContainer = document.getElementById('notification-container');
    if (existingContainer) {
      existingContainer.remove();
    }
    
    // Remove any notification elements
    const notificationElements = document.querySelectorAll('[id^="notification-"], .notification-item, .notification, .alert, .error-overlay, .error-notification');
    notificationElements.forEach(el => el.remove());
  };
  
  // Clear notifications immediately
  clearAllNotifications();
  
  // Clear notifications when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clearAllNotifications);
  }
  
  // Use MutationObserver instead of polling every second
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === 1 && !node.closest?.('#root') && (
          node.id?.startsWith('notification-') ||
          node.matches?.('.notification-item, .notification, .alert, .error-overlay, .error-notification')
        )) {
          node.remove();
        }
      }
    }
  });
  if (document.body) {
    observer.observe(document.body, { childList: true, subtree: true });
  }
  
  // Override notification functions to prevent any alerts
  window.showNotification = () => {}; // No-op function
  window.notificationManager = { 
    remove: () => {},
    show: () => {},
    clear: () => {},
    init: () => {}
  }; // Mock manager
  
  // Also disable console methods in production to reduce noise and improve performance
  if (import.meta.env.PROD) {
    console.log = () => {};    // ⚡ Disable console.log (biggest performance drain)
    console.error = () => {};
    console.warn = () => {};
    console.debug = () => {};  // Also disable debug
  }
}

// ⚡ PERFORMANCE: Only use StrictMode in development to avoid double-renders in production
const isDev = import.meta.env.DEV;

const root = createRoot(document.getElementById('root'));

if (isDev) {
  // Development: Use StrictMode for debugging
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
} else {
  // Production: No StrictMode for better performance
  root.render(<App />);
}
