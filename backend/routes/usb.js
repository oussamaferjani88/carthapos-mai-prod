const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { exec } = require('child_process');
const { promisify } = require('util');
const { requirePermissionForAdmin } = require('../middleware/permissions');
const router = express.Router();

const execAsync = promisify(exec);

function deviceIdOf(pnpDeviceId, serial) {
  const material = `${pnpDeviceId || ''}|${serial || ''}`.trim();
  if (!material || material === '|') return null;
  return crypto.createHash('sha256').update(material, 'utf8').digest('hex').substring(0, 32);
}

// GET /api/usb/drives - Détecter les clés USB disponibles
// (admin sessions need `usb.view`)
router.get('/drives', requirePermissionForAdmin('usb.view'), async (req, res) => {
  try {
    const drives = await detectUSBDrives();
    res.json({ drives });
  } catch (error) {
    console.error('Error detecting USB drives:', error);
    res.status(500).json({ error: 'Failed to detect USB drives' });
  }
});

// POST /api/usb/write-license - Écrire le fichier de licence sur la clé USB
// (admin sessions need `usb.write`)
router.post('/write-license', requirePermissionForAdmin('usb.write'), async (req, res) => {
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
// (admin sessions need `usb.view`)
router.get('/verify-license/:drivePath(*)', requirePermissionForAdmin('usb.view'), async (req, res) => {
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
      // PowerShell CIM: USB disks + mount points + PNP device IDs + serial numbers.
      // Mirrors the POS-side USBIdentityProvider.cjs so the backend can compute
      // the same stable deviceId that the Electron app will use for binding.
      const psScript = `
        $disks = Get-CimInstance Win32_DiskDrive | Where-Object { $_.InterfaceType -eq 'USB' }
        $diskToPart = @{}
        Get-CimInstance Win32_DiskDriveToDiskPartition | ForEach-Object { $diskToPart[$_.Dependent.DeviceID] = $_.Antecedent.DeviceID }
        $partToLogical = @{}
        Get-CimInstance Win32_LogicalDiskToPartition | ForEach-Object { $partToLogical[$_.Dependent.DeviceID] = $_.Antecedent.DeviceID }
        $out = @()
        foreach ($d in $disks) {
          $letters = @()
          foreach ($part in $diskToPart.Keys) {
            foreach ($lp in $partToLogical.Keys) {
              if ($partToLogical[$lp] -eq $part -and $lp -match '^\\\\\\\\.\\\\[A-Z]:$') {
                $letters += ($lp -replace '^\\\\\\\\.\\\\','')
              }
            }
          }
          foreach ($l in $letters) {
            $out += [PSCustomObject]@{
              Path = $l
              PNPDeviceId = $d.PNPDeviceID
              Serial = $d.SerialNumber.Trim()
              SizeBytes = $d.Size
            }
          }
        }
        $out | ConvertTo-Json -Compress
      `;
      const { stdout } = await execAsync(
        `powershell.exe -NoProfile -NonInteractive -Command "${psScript.replace(/"/g, '\\"')}"`
      );

      if (stdout.trim()) {
        let parsed;
        try { parsed = JSON.parse(stdout); } catch (e) { parsed = []; }
        const list = Array.isArray(parsed) ? parsed : [parsed];

        for (const d of list) {
          if (!d || !d.Path) continue;
          const pnp = d.PNPDeviceId || '';
          const serial = (d.Serial || '').trim();
          const drivePath = /^[A-Za-z]:$/.test(d.Path) ? `${d.Path}\\` : d.Path;
          drives.push({
            path: drivePath,
            driveLetter: d.Path,
            label: `USB Drive (${d.Path})`,
            serial,
            pnpDeviceId: pnp,
            deviceId: deviceIdOf(pnp, serial),
            size: d.SizeBytes || 0,
            freeSpace: 0,
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
                try {
                  const { stdout } = await execAsync(`df "${fullPath}" | tail -1`);
                  const parts = stdout.trim().split(/\s+/);

                  if (parts.length >= 4) {
                    const size = parseInt(parts[1]) * 1024;
                    const available = parseInt(parts[3]) * 1024;

                    drives.push({
                      path: fullPath,
                      label: `USB Drive (${subdir})`,
                      deviceId: deviceIdOf(fullPath, null),
                      size,
                      freeSpace: available,
                      type: 'removable'
                    });
                  }
                } catch (dfError) {
                  drives.push({
                    path: fullPath,
                    label: `USB Drive (${subdir})`,
                    deviceId: deviceIdOf(fullPath, null),
                    size: 0,
                    freeSpace: 0,
                    type: 'removable'
                  });
                }
              }
            } catch (statError) {
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

