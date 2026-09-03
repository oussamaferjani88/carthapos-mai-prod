/**
 * Environment Detection Utility
 * 
 * Determines if the POS is running in:
 * - Preview Mode: Browser-based preview in admin panel (with demo data)
 * - Production Mode: Electron application (.exe) (clean database)
 */

/**
 * Check if we're in preview mode (browser) or production mode (Electron)
 * @returns {boolean} true if preview mode, false if production
 */
export const isPreviewMode = () => {
  // Check 1: SSR context
  if (typeof window === 'undefined') {
    return false;
  }

  // Check 2: If Electron API exists, we're ALWAYS in production mode
  // Don't check hostname - Electron uses file:// protocol which may have empty/null hostname
  if (window.electronAPI) {
    console.log('✅ Electron API detected → PRODUCTION MODE (Database authentication)');
    return false; // Production mode - use real database
  }

  // Check 3: No Electron API = browser = preview mode
  console.log('🌐 No Electron API → PREVIEW MODE (Demo users)');
  return true; // Preview mode - use demo users
};

/**
 * Check if we're in production mode (Electron application)
 * @returns {boolean} true if production mode, false if preview
 */
export const isProductionMode = () => {
  return !isPreviewMode();
};

/**
 * Get demo data only in preview mode, empty array in production
 * @param {Array} demoData - Demo data to use in preview
 * @returns {Array} demoData in preview, empty array in production
 */
export const getPreviewData = (demoData = []) => {
  return isPreviewMode() ? demoData : [];
};

/**
 * Log environment info (for debugging)
 */
export const logEnvironment = () => {
  const mode = isPreviewMode() ? '🌐 PREVIEW MODE' : '⚡ PRODUCTION MODE';
  const hasElectron = typeof window !== 'undefined' && !!window.electronAPI;
  const hostname = typeof window !== 'undefined' && window.location 
    ? window.location.hostname 
    : 'N/A';

  console.log('='.repeat(50));
  console.log(`🔍 Environment Detection: ${mode}`);
  console.log(`📦 Electron API: ${hasElectron ? 'Available' : 'Not Available'}`);
  console.log(`🌍 Hostname: ${hostname}`);
  console.log('='.repeat(50));
};

export default {
  isPreviewMode,
  isProductionMode,
  getPreviewData,
  logEnvironment
};
