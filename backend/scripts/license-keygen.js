'use strict';

/**
 * CarthaPos license Ed25519 key generator.
 *
 * Usage:
 *   node scripts/license-keygen.js
 *
 * Output:
 *   - config/license-private.pem : backend-only signing key (never commit, never log)
 *   - stdout                     : public key PEM + .env snippets + fingerprint
 *
 * The public key must be embedded in generated POS applications (see the
 * backend generator pipeline). The private key is used ONLY server-side.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function fingerprint(pubPem) {
  const der = pubPem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');
  return crypto.createHash('sha256').update(Buffer.from(der, 'base64')).digest('hex').substring(0, 16);
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString();

const outDir = path.join(__dirname, '..', 'config');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, 'license-private.pem');
fs.writeFileSync(outFile, privateKeyPem, { encoding: 'utf8', mode: 0o600 });
console.log(`[ok] Private key written to ${outFile} (mode 600, backend-only). Never commit or share this file.`);

const fp = fingerprint(publicKeyPem);

console.log('\n════════════════════════════════════════════════════════');
console.log('PUBLIC KEY (embed this in generated POS apps)');
console.log('════════════════════════════════════════════════════════');
console.log(publicKeyPem.trim());
console.log('Public key fingerprint:', fp);
console.log('\n════════════════════════════════════════════════════════');
console.log('Add to backend/.env:');
console.log('════════════════════════════════════════════════════════');
console.log(`LICENSE_PUBLIC_KEY="${publicKeyPem.replace(/\n/g, '\\n')}"`);
console.log(`LICENSE_PRIVATE_KEY_FILE=${path.relative(process.cwd(), outFile).replace(/\\/g, '/')}`);
console.log('\nThe private key was NOT printed to stdout.');
