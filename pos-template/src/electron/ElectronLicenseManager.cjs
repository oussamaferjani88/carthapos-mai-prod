/**
 * Electron License Manager
 * Extracted from monolithic electron.js for better organization
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

class ElectronLicenseManager {
  constructor() {
    this.licenseData = null;
    this.secretKey = 'pos-license-secret-2024';
  }

  /**
   * Detect USB drives for license validation
   */
  async detectUSBDrives() {
    console.log('🔍 Detecting USB drives...');
    
    try {
      const drives = [];
      
      if (process.platform === 'win32') {
        // Windows: Check common drive letters
        const driveLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        
        for (const letter of driveLetters) {
          const drivePath = `${letter}:\\`;
          try {
            if (fs.existsSync(drivePath)) {
              fs.statSync(drivePath); // Check accessibility
              drives.push({
                path: drivePath,
                label: `Drive ${letter}`,
                isRemovable: true // Simplified check
              });
            }
          } catch {
            // Drive not accessible, skip
          }
        }
      } else {
        // Linux/macOS: Check /media and /mnt
        const mediaPaths = ['/media', '/mnt', '/Volumes'];
        
        for (const mediaPath of mediaPaths) {
          try {
            if (fs.existsSync(mediaPath)) {
              const items = fs.readdirSync(mediaPath);
              for (const item of items) {
                const fullPath = path.join(mediaPath, item);
                if (fs.statSync(fullPath).isDirectory()) {
                  drives.push({
                    path: fullPath,
                    label: item,
                    isRemovable: true
                  });
                }
              }
            }
          } catch {
            // Path not accessible, skip
          }
        }
      }
      
      console.log(`🔍 Found ${drives.length} drives:`, drives.map(d => d.path));
      return drives;
      
    } catch (error) {
      console.error('❌ Error detecting USB drives:', error);
      return [];
    }
  }

  /**
   * Validate USB license
   */
  async validateUSBLicense() {
    console.log('🔐 Validating USB license...');
    
    try {
      const drives = await this.detectUSBDrives();
      
      for (const drive of drives) {
        const licenseFilePath = path.join(drive.path, 'license.key');
        
        if (fs.existsSync(licenseFilePath)) {
          console.log('🔑 Found license file:', licenseFilePath);
          
          try {
            const licenseContent = fs.readFileSync(licenseFilePath, 'utf8');
            const validatedLicense = await this.decryptAndValidateLicense(licenseContent);
            
            if (validatedLicense) {
              console.log('✅ Valid license found on USB drive:', drive.path);
              this.licenseData = validatedLicense;
              return validatedLicense;
            }
          } catch (error) {
            console.error('❌ Error reading license from', drive.path, ':', error.message);
          }
        }
      }
      
      console.log('❌ No valid license found on any USB drive');
      return null;
      
    } catch (error) {
      console.error('❌ USB license validation failed:', error);
      return null;
    }
  }

  /**
   * Decrypt and validate license content
   */
  async decryptAndValidateLicense(encryptedContent) {
    console.log('🔓 Decrypting and validating license...');
    
    try {
      // Remove any whitespace and newlines
      const cleanContent = encryptedContent.trim();
      
      // Decrypt the license
      const bytes = CryptoJS.AES.decrypt(cleanContent, this.secretKey);
      const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedData) {
        throw new Error('Failed to decrypt license data');
      }
      
      // Parse the JSON
      const licenseData = JSON.parse(decryptedData);
      
      // Validate required fields
      const requiredFields = ['licenseKey', 'clientName', 'expirationDate', 'sector'];
      for (const field of requiredFields) {
        if (!licenseData[field]) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      // Check expiration date
      const expirationDate = new Date(licenseData.expirationDate);
      const currentDate = new Date();
      
      if (expirationDate < currentDate) {
        throw new Error('License has expired');
      }
      
      // Validate license signature/hash
      const expectedHash = this.generateLicenseHash(licenseData);
      if (licenseData.hash !== expectedHash) {
        throw new Error('License signature validation failed');
      }
      
      console.log('✅ License validation successful');
      console.log('📋 License info:', {
        client: licenseData.clientName,
        sector: licenseData.sector,
        expires: licenseData.expirationDate
      });
      
      return licenseData;
      
    } catch (error) {
      console.error('❌ License validation failed:', error.message);
      return null;
    }
  }

  /**
   * Generate license hash for validation
   */
  generateLicenseHash(licenseData) {
    const hashInput = `${licenseData.licenseKey}${licenseData.clientName}${licenseData.expirationDate}${licenseData.sector}`;
    return crypto.createHash('sha256').update(hashInput + this.secretKey).digest('hex');
  }

  /**
   * Get current license data
   */
  getLicenseData() {
    return this.licenseData;
  }

  /**
   * Check if license is valid and not expired
   */
  isLicenseValid() {
    if (!this.licenseData) {
      return false;
    }
    
    try {
      const expirationDate = new Date(this.licenseData.expirationDate);
      const currentDate = new Date();
      
      return expirationDate >= currentDate;
    } catch (error) {
      console.error('❌ Error checking license validity:', error);
      return false;
    }
  }

  /**
   * Get license status information
   */
  getLicenseStatus() {
    if (!this.licenseData) {
      return {
        isValid: false,
        status: 'No license found',
        error: 'License not loaded'
      };
    }

    try {
      const expirationDate = new Date(this.licenseData.expirationDate);
      const currentDate = new Date();
      const isValid = expirationDate >= currentDate;
      
      const daysUntilExpiry = Math.ceil((expirationDate - currentDate) / (1000 * 60 * 60 * 24));
      
      return {
        isValid: isValid,
        status: isValid ? 'Valid' : 'Expired',
        clientName: this.licenseData.clientName,
        sector: this.licenseData.sector,
        expirationDate: this.licenseData.expirationDate,
        daysUntilExpiry: daysUntilExpiry,
        licenseKey: this.licenseData.licenseKey
      };
    } catch (error) {
      return {
        isValid: false,
        status: 'Error',
        error: error.message
      };
    }
  }

  /**
   * Set license data manually (for testing)
   */
  setLicenseData(licenseData) {
    this.licenseData = licenseData;
    console.log('🔧 License data set manually');
  }

  /**
   * Clear license data
   */
  clearLicenseData() {
    this.licenseData = null;
    console.log('🗑️ License data cleared');
  }
}

module.exports = ElectronLicenseManager;
