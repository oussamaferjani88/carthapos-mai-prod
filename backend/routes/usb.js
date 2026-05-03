const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const router = express.Router();

const execAsync = promisify(exec);

// GET /api/usb/drives - Détecter les clés USB disponibles
router.get('/drives', async (req, res) => {
  try {
    const drives = await detectUSBDrives();
    res.json({ drives });
  } catch (error) {
    console.error('Error detecting USB drives:', error);
    res.status(500).json({ error: 'Failed to detect USB drives' });
  }
});

// POST /api/usb/write-license - Écrire le fichier de licence sur la clé USB
router.post('/write-license', async (req, res) => {
  try {
    const { drivePath, licenseContent, licenseKey } = req.body;

    if (!drivePath || !licenseContent || !licenseKey) {
      return res.status(400).json({ 
        error: 'Drive path, license content, and license key are required' 
      });
    }

    // Vérifier que le chemin existe et est accessible
    if (!fs.existsSync(drivePath)) {
      return res.status(404).json({ error: 'USB drive not found' });
    }

    // Créer le fichier license.key sur la clé USB
    const licenseFilePath = path.join(drivePath, 'license.key');
    
    try {
      fs.writeFileSync(licenseFilePath, licenseContent, 'utf8');
      
      // Vérifier que le fichier a été écrit correctement
      if (fs.existsSync(licenseFilePath)) {
        res.json({ 
          message: 'License file written successfully',
          path: licenseFilePath
        });
      } else {
        throw new Error('File was not created');
      }
    } catch (writeError) {
      console.error('Error writing license file:', writeError);
      res.status(500).json({ 
        error: 'Failed to write license file to USB drive',
        details: writeError.message
      });
    }
  } catch (error) {
    console.error('Error writing license to USB:', error);
    res.status(500).json({ error: 'Failed to write license to USB drive' });
  }
});

// GET /api/usb/verify-license/:drivePath - Vérifier la licence sur une clé USB
router.get('/verify-license/:drivePath(*)', async (req, res) => {
  try {
    const drivePath = req.params.drivePath;
    const licenseFilePath = path.join(drivePath, 'license.key');

    if (!fs.existsSync(licenseFilePath)) {
      return res.status(404).json({ error: 'License file not found on USB drive' });
    }

    const licenseContent = fs.readFileSync(licenseFilePath, 'utf8');
    
    res.json({ 
      message: 'License file found',
      content: licenseContent,
      path: licenseFilePath
    });
  } catch (error) {
    console.error('Error verifying license on USB:', error);
    res.status(500).json({ error: 'Failed to verify license on USB drive' });
  }
});

// Fonction pour détecter les clés USB
async function detectUSBDrives() {
  const drives = [];
  
  try {
    if (process.platform === 'win32') {
      // Windows - utiliser wmic pour détecter les lecteurs amovibles
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
      // Linux/macOS - vérifier les points de montage communs
      const mountPoints = ['/media', '/mnt', '/Volumes'];
      
      for (const mountPoint of mountPoints) {
        if (fs.existsSync(mountPoint)) {
          const subdirs = fs.readdirSync(mountPoint);
          
          for (const subdir of subdirs) {
            const fullPath = path.join(mountPoint, subdir);
            
            try {
              const stats = fs.statSync(fullPath);
              if (stats.isDirectory()) {
                // Essayer d'obtenir des informations sur l'espace disque
                try {
                  const { stdout } = await execAsync(`df "${fullPath}" | tail -1`);
                  const parts = stdout.trim().split(/\s+/);
                  
                  if (parts.length >= 4) {
                    const size = parseInt(parts[1]) * 1024; // Convertir de KB en bytes
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
                  // Si df échoue, ajouter quand même le lecteur sans informations de taille
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
              // Ignorer les erreurs de stat (permissions, etc.)
              continue;
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error detecting USB drives:', error);
  }
  
  return drives;
}

module.exports = router;

