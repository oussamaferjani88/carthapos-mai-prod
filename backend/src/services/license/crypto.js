'use strict';

/**
 * Ed25519 signing layer for CarthaPos licenses.
 *
 * - Private key lives ONLY on the backend (env LICENSE_PRIVATE_KEY or a PEM file).
 * - The matching PUBLIC key is embedded in every generated POS so the Electron
 *   runtime can verify licenses offline with Node's built-in crypto.
 * - License payloads are signed over a canonical, deterministically-serialized
 *   JSON form so that "byte equality" is not required between signer/verifier.
 */

const crypto = require('crypto');

const SIGNING_ALGORITHM = 'sha256';

/**
 * Deterministic JSON serialization (sorted keys, recursively).
 * Used so signer and verifier always hash the same bytes.
 */
function canonicalStringify(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'string') return JSON.stringify(value);
    return String(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalStringify(v)).join(',')}]`;
  }
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalStringify(value[k])}`).join(',')}}`;
}

function toBuffer(input, label) {
  if (Buffer.isBuffer(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed.includes('-----BEGIN')) {
      const pem = trimmed
        .replace(/-----BEGIN [A-Z ]+-----/, '')
        .replace(/-----END [A-Z ]+-----/, '')
        .replace(/\s+/g, '');
      return Buffer.from(pem, 'base64');
    }
    return Buffer.from(trimmed, 'base64');
  }
  throw new Error(`${label}: invalid key material`);
}

/**
 * Generate a fresh Ed25519 key pair.
 * @returns {{publicKeyPem: string, privateKeyPem: string}}
 */
function generateKeyPair() {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  return {
    publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
    privateKeyPem: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  };
}

function parsePrivateKey(privateKey) {
  return crypto.createPrivateKey({
    key: toBuffer(privateKey, 'private key'),
    format: 'der',
    type: 'pkcs8',
  });
}

function parsePublicKey(publicKey) {
  return crypto.createPublicKey({
    key: toBuffer(publicKey, 'public key'),
    format: 'der',
    type: 'spki',
  });
}

/**
 * Sign a payload object.
 * @returns {string} base64 signature
 */
function signPayload(payload, privateKey) {
  const key = parsePrivateKey(privateKey);
  const signature = crypto.sign(
    null,
    Buffer.from(canonicalStringify(payload), 'utf8'),
    key
  );
  return signature.toString('base64');
}

/**
 * Verify an Ed25519 signature over a payload object.
 * @returns {boolean}
 */
function verifySignature(payload, signature, publicKey) {
  try {
    const key = parsePublicKey(publicKey);
    return crypto.verify(
      null,
      Buffer.from(canonicalStringify(payload), 'utf8'),
      key,
      Buffer.from(signature, 'base64')
    );
  } catch (err) {
    return false;
  }
}

/**
 * Derive the public key PEM for a given private key.
 */
function derivePublicKey(privateKey) {
  const key = parsePrivateKey(privateKey);
  const pub = crypto.createPublicKey(key);
  return pub.export({ type: 'spki', format: 'pem' }).toString();
}

/**
 * Short, stable fingerprint of a public key (for audit + payload metadata).
 */
function fingerprintPublicKey(publicKey) {
  return crypto
    .createHash('sha256')
    .update(toBuffer(publicKey, 'public key'))
    .digest('hex')
    .substring(0, 16);
}

module.exports = {
  canonicalStringify,
  generateKeyPair,
  parsePrivateKey,
  parsePublicKey,
  signPayload,
  verifySignature,
  derivePublicKey,
  fingerprintPublicKey,
  SIGNING_ALGORITHM,
};
