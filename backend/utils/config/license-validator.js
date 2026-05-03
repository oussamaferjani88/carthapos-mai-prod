/**
 * License Validator - Validates and processes license data
 * Extracted from pos-generator.js for better modularity
 */

const { createLogger } = require('../common/logger');

const logger = createLogger('LicenseValidator');

/**
 * Validate license object structure and data
 * @param {Object} license - License object to validate
 * @returns {Promise<Object>} Validated license object
 */
async function validateLicense(license) {
  logger.debug('Starting license validation');

  if (!license) {
    throw new Error('License object is required');
  }

  // Check required fields
  const requiredFields = ['id', 'licenseKey', 'isActive', 'client'];
  for (const field of requiredFields) {
    if (!license[field]) {
      throw new Error(`License missing required field: ${field}`);
    }
  }

  // Validate license is active
  if (!license.isActive) {
    throw new Error('License is not active');
  }

  // Validate client data
  if (!license.client || !license.client.name) {
    throw new Error('License must have valid client data with name');
  }

  // Validate license key format
  if (typeof license.licenseKey !== 'string' || license.licenseKey.length < 8) {
    throw new Error('Invalid license key format');
  }

  // Process configuration data
  const processedLicense = {
    ...license,
    configuration: processConfiguration(license.configuration),
    modules: processModules(license.modules || [])
  };

  logger.info('License validation completed successfully');
  logger.debug('Processed license data:', {
    id: processedLicense.id,
    clientName: processedLicense.client.name,
    moduleCount: processedLicense.modules.length,
    hasConfiguration: !!processedLicense.configuration
  });

  return processedLicense;
}

/**
 * Process and validate configuration data
 * @param {Object} configuration - Configuration object
 * @returns {Object} Processed configuration
 */
function processConfiguration(configuration) {
  if (!configuration) {
    logger.warn('No configuration provided, using defaults');
    return getDefaultConfiguration();
  }

  // Merge with defaults to ensure all required fields are present
  const defaultConfig = getDefaultConfiguration();
  const processedConfig = { ...defaultConfig, ...configuration };

  // Validate color formats
  if (processedConfig.primaryColor && !isValidHexColor(processedConfig.primaryColor)) {
    logger.warn('Invalid primary color format, using default');
    processedConfig.primaryColor = defaultConfig.primaryColor;
  }

  if (processedConfig.secondaryColor && !isValidHexColor(processedConfig.secondaryColor)) {
    logger.warn('Invalid secondary color format, using default');
    processedConfig.secondaryColor = defaultConfig.secondaryColor;
  }

  return processedConfig;
}

/**
 * Process modules list
 * @param {Array} modules - Modules array
 * @returns {Array} Processed modules
 */
function processModules(modules) {
  if (!Array.isArray(modules)) {
    logger.warn('Modules is not an array, converting to empty array');
    return [];
  }

  return modules.map(moduleItem => {
    if (moduleItem.module) {
      return {
        name: moduleItem.module.name,
        enabled: moduleItem.enabled !== false,
        config: moduleItem.module.config || {}
      };
    }
    return {
      name: moduleItem.name || 'unknown',
      enabled: moduleItem.enabled !== false,
      config: moduleItem.config || {}
    };
  });
}

/**
 * Get default configuration values
 * @returns {Object} Default configuration
 */
function getDefaultConfiguration() {
  return {
    businessName: 'POS Business',
    primaryColor: '#3B82F6',
    secondaryColor: '#10B981',
    accentColor: '#F59E0B',
    backgroundColor: '#FFFFFF',
    textColor: '#1F2937',
    borderRadius: '8',
    customFont: 'Inter',
    language: 'en',
    currency: 'USD',
    features: {
      inventory: true,
      customers: true,
      reporting: true,
      multiLocation: false
    }
  };
}

/**
 * Validate hex color format
 * @param {string} color - Color string to validate
 * @returns {boolean} True if valid hex color
 */
function isValidHexColor(color) {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate license expiration
 * @param {Object} license - License object
 * @returns {boolean} True if license is not expired
 */
function isLicenseValid(license) {
  if (!license.expiresAt) {
    return true; // No expiration date means permanent license
  }

  const expirationDate = new Date(license.expiresAt);
  const now = new Date();
  
  return expirationDate > now;
}

module.exports = {
  validateLicense,
  processConfiguration,
  processModules,
  getDefaultConfiguration,
  isValidHexColor,
  isLicenseValid
};
