const fs = require('fs').promises;
const path = require('path');
const { generatePOSSystem } = require('./pos-generator');

/**
 * Direct converter from preview theme configuration to POS system
 * This utility bypasses the normal generation process and directly applies theme changes
 */
async function directPOSConverter(enrichedLicense) {
  try {
    console.log('[DirectConverter] Starting direct conversion for license:', enrichedLicense.id);
    
    // Use the existing POS generator with the enriched license
    const result = await generatePOSSystem(enrichedLicense);
    
    console.log('[DirectConverter] Direct conversion completed successfully');
    
    return {
      success: true,
      posPath: result.posPath,
      configuration: enrichedLicense.configuration,
      message: 'Direct conversion completed successfully'
    };
    
  } catch (error) {
    console.error('[DirectConverter] Error during direct conversion:', error);
    throw new Error(`Direct conversion failed: ${error.message}`);
  }
}

module.exports = {
  directPOSConverter
};