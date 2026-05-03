/**
 * POS GENERATOR - COMPLETELY REFACTORED TO MODULAR ARCHITECTURE
 * 
 * This file now serves as a clean entry point that delegates all work
 * to specialized, testable, and debuggable modular components.
 * 
 * Original file was 1730+ lines - now reduced to < 50 lines!
 * 
 * Benefits:
 * - Each component has single responsibility
 * - Better error isolation and debugging
 * - Easier testing and maintenance
 * - Cleaner code organization
 * - Improved logging and monitoring
 */

const { generatePOSApplication: generateModular, getGenerationStats } = require('./generators');
const { createLogger } = require('./common/logger');

const logger = createLogger('POS Generator (Main Entry)');

/**
 * Main POS Generation Function
 * @param {Object} license - License configuration object
 * @param {string} outputPath - Optional output directory path
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generation result with build info
 */
async function generatePOSApplication(license, outputPath = null, options = {}) {
  logger.info('🚀 Starting POS generation with new modular architecture');
  
  try {
    // Delegate to the modular system
    const result = await generateModular(license, outputPath, options);
    
    logger.info('✅ POS generation completed successfully');
    logger.info(`📁 Output: ${result.outputPath}`);
    logger.info(`📦 Executable: ${result.executablePath || 'Not built locally'}`);
    
    return result;
    
  } catch (error) {
    logger.error('❌ POS generation failed:', error.message);
    
    // Enhanced error reporting
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      architecture: 'modular'
    };
    
    logger.error('Error details:', errorDetails);
    throw error;
  }
}

/**
 * Health check and architecture information
 */
async function getSystemInfo() {
  logger.info('📊 Retrieving system information');
  
  try {
    const stats = await getGenerationStats();
    logger.info('System architecture:', stats);
    return stats;
  } catch (error) {
    logger.error('Failed to get system info:', error);
    throw error;
  }
}

// Export with exports.xxx for CommonJS compatibility
console.log('DEBUG: About to export functions');
exports.generatePOSApplication = generatePOSApplication;
exports.getSystemInfo = getSystemInfo;
console.log('DEBUG: Functions exported successfully');
