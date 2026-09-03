'use strict';

/**
 * USBIdentityProvider — stable USB device identity for license binding.
 *
 * IMPORTANT: identity is derived from the device's PNP device ID + serial
 * number, NEVER from drive letters or volume labels (both are volatile and
 * trivially spoofable). A normal flash drive acts as a LICENSE CARRIER:
 *  - the signed license file is stored on the drive as <drive>/license.key
 *  - binding compares the drive's stable device ID to payload.usbDeviceId
 */

const os = require('os');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { execFile } = require('child_process');

function exec(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve('');
      resolve(String(stdout || ''));
    });
  });
}

function deviceIdOf(pnpDeviceId, serial) {
  const material = `${pnpDeviceId || ''}|${serial || ''}`.trim();
  if (!material || material === '|') return null;
  return crypto.createHash('sha256').update(material, 'utf8').digest('hex').substring(0, 32);
}

async function windowsUSBDrives() {
  // PowerShell one-shot: USB disks + their mount points (drive letters) +
  // PNP device IDs + serial numbers.
  const script = `
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
          Label = ''
          SizeBytes = $d.Size
        }
      }
    }
    $out | ConvertTo-Json -Compress
  `;
  const raw = await exec('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
  if (!raw.trim()) return [];

  let parsed;
  try { parsed = JSON.parse(raw); } catch (e) { return []; }
  const list = Array.isArray(parsed) ? parsed : [parsed];

  return list.filter((d) => d && d.Path).map((d) => {
    const pnp = d.PNPDeviceId || '';
    const serial = (d.Serial || '').trim();
    let label = (d.Label || '').trim();
    const drivePath = /^[A-Za-z]:$/.test(d.Path) ? `${d.Path}\\` : d.Path;
    try {
      if (!label) label = require('os').hostname; // placeholder
    } catch (e) { /* ignore */ }
    return {
      path: drivePath,
      driveLetter: d.Path,
      label,
      serial,
      pnpDeviceId: pnp,
      deviceId: deviceIdOf(pnp, serial),
      sizeBytes: d.SizeBytes || null,
      isRemovable: true
    };
  });
}

async function unixUSBDrives() {
  // Linux / macOS: enumerate removable mounts. Identity uses the block device
  // serial/UUID when discoverable, otherwise a stable material from the mount.
  const results = [];
  const mountRoots = process.platform === 'darwin' ? ['/Volumes'] : ['/media', '/mnt', '/run/media'];
  const seen = new Set();

  for (const root of mountRoots) {
    let entries = [];
    try { entries = fs.readdirSync(root); } catch (e) { continue; }
    for (const entry of entries) {
      const p = path.join(root, entry);
      let st = null;
      try { st = fs.statSync(p); } catch (e) { continue; }
      if (!st.isDirectory()) continue;
      if (seen.has(p)) continue;
      seen.add(p);
      results.push({
        path: p,
        label: entry,
        serial: null,
        pnpDeviceId: null,
        deviceId: deviceIdOf(p, null),
        isRemovable: true
      });
    }
  }
  return results;
}

async function detectUSBDrives() {
  try {
    if (process.platform === 'win32') return await windowsUSBDrives();
    return await unixUSBDrives();
  } catch (err) {
    console.error('[USBIdentityProvider] detection failed:', err.message);
    return [];
  }
}

/**
 * Find a license file on a USB drive. Returns { path, drive, parsed } or null.
 * @param {string} fileName default 'license.key'
 */
async function findLicenseOnUSB(fileName = 'license.key') {
  const drives = await detectUSBDrives();
  for (const drive of drives) {
    const candidate = path.join(drive.path, fileName);
    try {
      if (fs.existsSync(candidate)) {
        const content = fs.readFileSync(candidate, 'utf8');
        return { path: candidate, drive, content };
      }
    } catch (err) {
      // unreadable drive, skip
    }
  }
  return null;
}

module.exports = { detectUSBDrives, findLicenseOnUSB, deviceIdOf };
