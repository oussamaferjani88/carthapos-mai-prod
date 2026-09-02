#!/usr/bin/env node

/**
 * TEMPORARY DIAGNOSTIC — machine-fingerprint discrepancy investigation.
 *
 * Prints the fingerprint produced by the CURRENT MachineIdentityProvider on
 * this machine and compares it with the machineFingerprint stored in a
 * license.key. Does NOT modify any production code.
 *
 * Usage:
 *   node scripts/diag-machine-fingerprint.cjs [path-to-license.key]
 *
 * Default license path: the currently installed POS's userData copy
 * (C:\Users\<user>\AppData\Roaming\carthapos-chnowalfaza\license.key).
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const {
  getMachineFingerprint,
  getMachineIdentity
} = require('../pos-template/src/electron/license/MachineIdentityProvider.cjs');

const DEFAULT_LICENSE_PATH = path.join(
  os.homedir(),
  'AppData',
  'Roaming',
  'carthapos-chnowalfaza',
  'license.key'
);

async function main() {
  const licensePath = process.argv[2] || DEFAULT_LICENSE_PATH;

  const ids = await getMachineIdentity();
  const current = await getMachineFingerprint();

  console.log('═══════════════════════════════════════════════════════');
  console.log('CURRENT MachineIdentityProvider on this machine');
  console.log('═══════════════════════════════════════════════════════');
  console.log('platform :', ids.platform);
  console.log('arch     :', ids.arch);
  console.log('machineGuid:', ids.machineGuid);
  console.log('cpuModel :', ids.cpuModel);
  console.log('cpuCores :', os.cpus().length, '(os.cpus().length = logical processors)');
  console.log('material :', [
    ids.platform,
    ids.arch,
    ids.machineGuid,
    ids.cpuModel,
    String(os.cpus().length)
  ].join('|'));
  console.log('FINGERPRINT:', current);
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('Stored machineFingerprint');
  console.log('═══════════════════════════════════════════════════════');
  if (!fs.existsSync(licensePath)) {
    console.log('license.key NOT FOUND at:', licensePath);
    process.exitCode = 1;
    return;
  }
  const raw = fs.readFileSync(licensePath, 'utf8');
  const parsed = JSON.parse(raw);
  const stored = parsed.payload && parsed.payload.machineFingerprint;
  console.log('license.key :', licensePath);
  console.log('licenseId   :', parsed.payload && parsed.payload.licenseId);
  console.log('licenseKey  :', parsed.payload && parsed.payload.licenseKey);
  console.log('bindingType :', parsed.payload && parsed.payload.bindingType);
  console.log('STORED      :', stored);
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('COMPARISON');
  console.log('═══════════════════════════════════════════════════════');
  if (current === stored) {
    console.log('MATCH ✅  the stored fingerprint was produced by the CURRENT algorithm on THIS machine.');
  } else {
    console.log('MISMATCH ❌');
    console.log('  current:', current);
    console.log('  stored :', stored);
    console.log('  The stored fingerprint was NOT produced by the current algorithm on this machine.');
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Diagnostic failed:', err);
  process.exit(1);
});
