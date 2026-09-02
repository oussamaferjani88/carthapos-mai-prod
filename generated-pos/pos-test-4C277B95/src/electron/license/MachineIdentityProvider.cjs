'use strict';

/**
 * MachineIdentityProvider — stable, hardware-derived machine fingerprint.
 *
 * The fingerprint intentionally does NOT depend on:
 *   - drive letters / volume labels (changeable)
 *   - hostname (changeable)
 *   - total RAM (changes on upgrade)
 *
 * It is a sha256 over stable platform + CPU + machine GUID identifiers.
 * Designed to be cheap to compute and stable across reboots/reinstalls.
 */

const os = require('os');
const crypto = require('crypto');
const { execFile } = require('child_process');

function exec(cmd, args) {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10000 }, (err, stdout) => {
      if (err) return resolve('');
      resolve(String(stdout || ''));
    });
  });
}

let cachedFingerprint = null;

async function windowsMachineGuid() {
  // Prefer CIM (modern); fall back to wmic.
  const psOut = await exec('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    '(Get-CimInstance Win32_ComputerSystemProduct -ErrorAction SilentlyContinue).UUID'
  ]);
  const guid = psOut.trim().split(/\r?\n/).pop().trim();
  if (guid && guid.length > 8) return guid;
  const wmicOut = await exec('wmic.exe', ['csproduct', 'get', 'uuid']);
  const m = wmicOut.match(/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12}/);
  return m ? m[0] : null;
}

async function linuxMachineGuid() {
  for (const p of ['/var/lib/dbus/machine-id', '/etc/machine-id']) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) {
        const v = fs.readFileSync(p, 'utf8').trim();
        if (v) return v;
      }
    } catch (err) {
      // ignore
    }
  }
  return null;
}

async function macMachineGuid() {
  const out = await exec('ioreg', ['-rd1', '-c', 'IOPlatformExpertDevice']);
  const m = out.match(/"IOPlatformUUID"\s*=\s*"([^"]+)"/);
  return m ? m[1] : null;
}

async function collectIdentifiers() {
  let machineGuid = null;
  if (process.platform === 'win32') machineGuid = await windowsMachineGuid();
  else if (process.platform === 'linux') machineGuid = await linuxMachineGuid();
  else if (process.platform === 'darwin') machineGuid = await macMachineGuid();

  const cpu = os.cpus()[0];
  return {
    platform: os.platform(),
    arch: os.arch(),
    machineGuid,
    cpuModel: cpu ? cpu.model : null,
    cpuCores: os.cpus().length
  };
}

async function getMachineFingerprint() {
  if (cachedFingerprint) return cachedFingerprint;
  const ids = await collectIdentifiers();
  const material = [
    ids.platform,
    ids.arch,
    ids.machineGuid || '',
    ids.cpuModel || '',
    String(ids.cpuCores)
  ].join('|');
  cachedFingerprint = crypto.createHash('sha256').update(material, 'utf8').digest('hex').substring(0, 32);
  return cachedFingerprint;
}

async function getMachineIdentity() {
  const ids = await collectIdentifiers();
  return {
    fingerprint: await getMachineFingerprint(),
    machineGuid: ids.machineGuid,
    platform: ids.platform,
    arch: ids.arch,
    cpuModel: ids.cpuModel
  };
}

module.exports = { getMachineFingerprint, getMachineIdentity };
