const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

class USBRepository {
  /**
   * Detect available USB drives on the system
   */
  async detectDrives() {
    const drives = [];
    
    try {
      if (process.platform === 'win32') {
        // Windows - use wmic to detect removable drives
        const { stdout } = await execAsync('wmic logicaldisk where drivetype=2 get size,freespace,caption');
        const lines = stdout.split('\n').filter(line => line.trim() && !line.includes('Caption'));
        
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const caption = parts[0];
            const freeSpace = parseInt(parts[1]) || 0;
            const size = parseInt(parts[2]) || 0;
            
            drives.push({
              path: caption,
              label: `USB Drive (${caption})`,
              size: size,
              freeSpace: freeSpace,
              type: 'removable'
            });
          }
        }
      } else {
        // Linux/macOS - check common mount points
        const mountPoints = ['/media', '/mnt', '/Volumes'];
        
        for (const mountPoint of mountPoints) {
          if (fs.existsSync(mountPoint)) {
            const subdirs = fs.readdirSync(mountPoint);
            
            for (const subdir of subdirs) {
              const fullPath = path.join(mountPoint, subdir);
              
              try {
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                  // Try to get disk space information
                  try {
                    const { stdout } = await execAsync(`df "${fullPath}" | tail -1`);
                    const parts = stdout.trim().split(/\s+/);
                    
                    if (parts.length >= 4) {
                      const size = parseInt(parts[1]) * 1024; // Convert from KB to bytes
                      const available = parseInt(parts[3]) * 1024;
                      
                      drives.push({
                        path: fullPath,
                        label: `USB Drive (${subdir})`,
                        size: size,
                        freeSpace: available,
                        type: 'removable'
                      });
                    }
                  } catch (dfError) {
                    // If df fails, still add the drive without size information
                    drives.push({
                      path: fullPath,
                      label: `USB Drive (${subdir})`,
                      size: 0,
                      freeSpace: 0,
                      type: 'removable'
                    });
                  }
                }
              } catch (statError) {
                // Ignore stat errors (permissions, etc.)
                continue;
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error detecting USB drives:', error);
      throw error;
    }
    
    return drives;
  }

  /**
   * Check if a drive path exists and is accessible
   */
  driveExists(drivePath) {
    return fs.existsSync(drivePath);
  }

  /**
   * Write license file to USB drive
   */
  writeLicenseFile(drivePath, licenseContent) {
    const licenseFilePath = path.join(drivePath, 'license.key');
    
    try {
      fs.writeFileSync(licenseFilePath, licenseContent, 'utf8');
      
      // Verify the file was written correctly
      if (!fs.existsSync(licenseFilePath)) {
        throw new Error('File was not created');
      }
      
      return licenseFilePath;
    } catch (error) {
      throw new Error(`Failed to write license file: ${error.message}`);
    }
  }

  /**
   * Read license file from USB drive
   */
  readLicenseFile(drivePath) {
    const licenseFilePath = path.join(drivePath, 'license.key');
    
    if (!fs.existsSync(licenseFilePath)) {
      throw new Error('License file not found on USB drive');
    }
    
    const licenseContent = fs.readFileSync(licenseFilePath, 'utf8');
    
    return {
      content: licenseContent,
      path: licenseFilePath
    };
  }

  /**
   * Check if license file exists on USB drive
   */
  licenseFileExists(drivePath) {
    const licenseFilePath = path.join(drivePath, 'license.key');
    return fs.existsSync(licenseFilePath);
  }
}

module.exports = new USBRepository();
