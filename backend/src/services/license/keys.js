'use strict';

/**
 * License signing-key resolution.
 *
 * The private key MUST only ever live on the backend. It is loaded from
 * LICENSE_PRIVATE_KEY (PEM / base64 inline) or LICENSE_PRIVATE_KEY_FILE (path).
 * The public key is loaded from LICENSE_PUBLIC_KEY / LICENSE_PUBLIC_KEY_FILE.
 *
 * If neither private key nor public key is configured, key access throws — the
 * system refuses to silently fall back to a hardcoded secret.
 */

const fs = require('fs');
const path = require('path');

function readEnvOrFile(inline, file, label) {
  if (inline) return inline.trim();
  if (file) {
    const resolved = path.resolve(file);
    if (!fs.existsSync(resolved)) {
      throw new Error(`[license-keys] ${label} file not found: ${resolved}`);
    }
    return fs.readFileSync(resolved, 'utf8').trim();
  }
  return null;
}

let cachedPrivateKey = null;
let cachedPublicKey = null;

function getPrivateKey() {
  if (cachedPrivateKey) return cachedPrivateKey;
  cachedPrivateKey = readEnvOrFile(
    process.env.LICENSE_PRIVATE_KEY,
    process.env.LICENSE_PRIVATE_KEY_FILE,
    'LICENSE_PRIVATE_KEY'
  );
  if (!cachedPrivateKey) {
    throw new Error(
      '[license-keys] LICENSE_PRIVATE_KEY (or LICENSE_PRIVATE_KEY_FILE) is not configured. Refusing to fall back to a hardcoded secret.'
    );
  }
  return cachedPrivateKey;
}

function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  cachedPublicKey = readEnvOrFile(
    process.env.LICENSE_PUBLIC_KEY,
    process.env.LICENSE_PUBLIC_KEY_FILE,
    'LICENSE_PUBLIC_KEY'
  );
  if (!cachedPublicKey) {
    throw new Error(
      '[license-keys] LICENSE_PUBLIC_KEY (or LICENSE_PUBLIC_KEY_FILE) is not configured.'
    );
  }
  return cachedPublicKey;
}

module.exports = { getPrivateKey, getPublicKey };
