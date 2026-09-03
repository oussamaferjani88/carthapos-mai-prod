'use strict';

/**
 * LicenseVerifier — offline-capable license validation for the Electron POS.
 *
 * Canonical IPC contract returned by every method:
 *   { isValid: boolean, status: string|null, reason: (LicenseFailureReason|null), license: Object|null }
 *
 * Verification is LOCAL: the Ed25519 public key is embedded in the generated
 * app (app-config.json -> security.licensePublicKey) and the signature over the
 * deterministic payload is checked with Node's built-in crypto. No network is
 * required for a signed, un-expired, correctly-bound license.
 *
 * Online features (optional, best-effort):
 *   - activation: binds the machine/USB identity and fetches a re-signed file
 *   - validation refresh: syncs server-side status (REVOKED/SUSPENDED/EXPIRED)
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getMachineFingerprint } = require('./MachineIdentityProvider.cjs');
const { findLicenseOnUSB } = require('./USBIdentityProvider.cjs');

const LICENSE_VERSION = 1;
const CLOCK_ROLLBACK_TOLERANCE_MS = 12 * 60 * 60 * 1000; // 12h
const DEFAULT_OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const FETCH_TIMEOUT_MS = 8000;

class LicenseVerifier {
  /**
   * @param {Object} opts
   * @param {import('electron').App} opts.app
   * @param {Function} opts.loadAppConfig
   */
  constructor({ app, loadAppConfig }) {
    this.app = app;
    this.loadAppConfig = loadAppConfig;
    this.statePath = path.join(app.getPath('userData'), 'license-state.json');
  }

  // ── configuration helpers ───────────────────────────────────

  _config() {
    return this.loadAppConfig() || {};
  }

  _security() {
    return this._config().security || {};
  }

  getPublicKey() {
    const pk = this._security().licensePublicKey;
    if (!pk) return null;
    return pk.includes('BEGIN') ? pk : Buffer.from(pk, 'base64').toString('utf8');
  }

  getServerUrl() {
    return this._security().licenseServerUrl || process.env.CARTHAPOS_LICENSE_SERVER || null;
  }

  /**
   * Build an API URL against the configured server. Accepts a base that may or
   * may not include a trailing `/api` and never duplicates the prefix.
   */
  _apiUrl(routePath) {
    const base = (this.getServerUrl() || '').trim().replace(/\/+$/, '');
    if (!base) return null;
    const apiBase = /\/api$/.test(base) ? base : `${base}/api`;
    return `${apiBase}/${routePath.replace(/^\/+/, '')}`;
  }

  getLicenseFileName() {
    return this._security().licenseFileName || 'license.key';
  }

  _devMode() {
    return process.env.CARTHAPOS_LICENSE_DEV_MODE === 'true';
  }

  _state() {
    try {
      if (fs.existsSync(this.statePath)) {
        return JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
      }
    } catch (err) {
      // ignore corrupt state
    }
    return {};
  }

  _saveState(patch) {
    try {
      const next = { ...this._state(), ...patch };
      fs.writeFileSync(this.statePath, JSON.stringify(next, null, 2), 'utf8');
    } catch (err) {
      console.error('[LicenseVerifier] failed to persist state:', err.message);
    }
  }

  // ── canonical results ───────────────────────────────────────

  _result(isValid, status, reason, license) {
    return { isValid, status, reason, license: license || null };
  }

  _ok(payload) {
    return this._result(true, 'ACTIVE', null, payload);
  }

  // ── license file sourcing ───────────────────────────────────

  /**
   * Locate the license file. Prefers USB for USB/HYBRID bindings, then the
   * persisted local copy (userData/license.key) for MACHINE-bound licenses,
   * then the copy bundled inside the generated app (enables first-run
   * self-activation for MACHINE-bound POS without a USB carrier).
   */
  async _findLicenseSource(payloadHint) {
    const fileName = this.getLicenseFileName();
    const bindingType = payloadHint && payloadHint.bindingType;

    if (bindingType === 'USB' || bindingType === 'HYBRID') {
      const usb = await findLicenseOnUSB(fileName);
      if (usb) return { source: 'usb', ...usb };
      return null;
    }

    // MACHINE (or unknown): local copy first, then USB carrier fallback, then bundled.
    const localPath = path.join(this.app.getPath('userData'), fileName);
    try {
      if (fs.existsSync(localPath)) {
        return { source: 'local', path: localPath, content: fs.readFileSync(localPath, 'utf8') };
      }
    } catch (err) {
      // ignore
    }
    const usb = await findLicenseOnUSB(fileName);
    if (usb) return { source: 'usb', ...usb };
    const bundled = this._findBundledSource(fileName);
    if (bundled) return bundled;

    // Final fallback: the signed license embedded in app-config.json
    // (delivered alongside the app config — the same channel loadAppConfig uses).
    const embedded = this._config().licenseFile;
    if (embedded && embedded.format === 'carthapos-license' && embedded.payload && embedded.signature) {
      return { source: 'config', content: JSON.stringify(embedded) };
    }
    return null;
  }

  _findBundledSource(fileName) {
    const candidates = [];
    try {
      // Packaged: inside app.asar (build.files includes resources/**/*).
      // Development: the project's resources/ folder (app.getAppPath() = project root).
      candidates.push(path.join(this.app.getAppPath(), 'resources', fileName));
      // Packaged: electron-builder may unpack resources/ next to app.asar.
      candidates.push(path.join(process.resourcesPath, fileName));
      // Portable build: the license file shipped next to the executable.
      if (process.env.PORTABLE_EXECUTABLE_DIR) {
        candidates.push(path.join(process.env.PORTABLE_EXECUTABLE_DIR, fileName));
      }
    } catch (err) {
      // ignore
    }
    for (const candidate of candidates) {
      try {
        if (fs.existsSync(candidate)) {
          return { source: 'bundled', path: candidate, content: fs.readFileSync(candidate, 'utf8') };
        }
      } catch (err) {
        // ignore
      }
    }
    return null;
  }

  _parse(content) {
    try {
      const parsed = JSON.parse(content);
      if (!parsed || parsed.format !== 'carthapos-license') return { ok: false, reason: 'LICENSE_CORRUPTED' };
      if (!parsed.payload || !parsed.signature) return { ok: false, reason: 'LICENSE_CORRUPTED' };
      return { ok: true, parsed };
    } catch (err) {
      return { ok: false, reason: 'LICENSE_CORRUPTED' };
    }
  }

  _verifySignature(parsed, publicKey) {
    if (!publicKey) return false;
    try {
      return crypto.verify(
        null,
        Buffer.from(canonicalStringify(parsed.payload), 'utf8'),
        crypto.createPublicKey({ key: publicKey, format: 'pem', type: 'spki' }),
        Buffer.from(parsed.signature, 'base64')
      );
    } catch (err) {
      return false;
    }
  }

  // ── core validation ─────────────────────────────────────────

  async validateLocal() {
    if (this._devMode()) {
      return this._result(true, 'ACTIVE', null, {
        licenseKey: 'DEV-LICENSE',
        clientName: 'Development Mode',
        sector: 'development',
        licenseType: 'LIFETIME',
        bindingType: 'MACHINE',
        modules: []
      });
    }

    const source = await this._findLicenseSource(null);
    if (!source) {
      return this._result(false, 'NO_LICENSE', 'NO_LICENSE', null);
    }

    const parseResult = this._parse(source.content);
    if (!parseResult.ok) {
      return this._result(false, null, parseResult.reason, null);
    }
    const { payload, signature } = parseResult.parsed;

    const publicKey = this.getPublicKey();
    if (!publicKey) {
      return this._result(false, null, 'INVALID_SIGNATURE', null);
    }
    if (!this._verifySignature(parseResult.parsed, publicKey)) {
      return this._result(false, null, 'INVALID_SIGNATURE', null);
    }

    if ((payload.version || 1) > LICENSE_VERSION) {
      return this._result(false, null, 'UNSUPPORTED_LICENSE_VERSION', null);
    }

    // Clock rollback detection (persisted last-known-good time).
    const now = Date.now();
    const state = this._state();
    if (state.lastKnownGoodTime && now < state.lastKnownGoodTime - CLOCK_ROLLBACK_TOLERANCE_MS) {
      return this._result(false, null, 'CLOCK_ROLLBACK', this._toLicenseView(payload));
    }

    // Status gate
    if (payload.status === 'REVOKED' || payload.status === 'REPLACED') {
      return this._result(false, payload.status, 'REVOKED', this._toLicenseView(payload));
    }
    if (payload.status === 'SUSPENDED') {
      return this._result(false, 'SUSPENDED', 'SUSPENDED', this._toLicenseView(payload));
    }

    // Expiration
    if (payload.licenseType === 'SUBSCRIPTION' && payload.expirationDate) {
      const expiresAt = new Date(payload.expirationDate).getTime();
      if (now > expiresAt) {
        return this._result(false, 'EXPIRED', 'EXPIRED', this._toLicenseView(payload));
      }
    }

    // Binding enforcement
    const bindingResult = await this._checkBinding(payload, source);
    if (!bindingResult.ok) {
      return this._result(false, null, bindingResult.reason, this._toLicenseView(payload));
    }

    // Offline grace for subscription licenses that have not been refreshed.
    // Anchor: last successful validation, else issuance date (fresh licenses
    // work offline from day one; the grace clock starts at issue).
    if (payload.licenseType === 'SUBSCRIPTION') {
      const anchor = state.lastKnownGoodTime || (payload.issuedAt ? Date.parse(payload.issuedAt) : 0);
      if (now - anchor > DEFAULT_OFFLINE_GRACE_MS) {
        // Try an online refresh before declaring grace expiry.
        const refreshed = await this._tryOnlineRefresh(payload, source);
        if (refreshed && refreshed.isValid) {
          this._saveState({ lastKnownGoodTime: Date.now() });
          return refreshed;
        }
        return this._result(false, 'OFFLINE_GRACE_EXPIRED', 'OFFLINE_GRACE_EXPIRED', this._toLicenseView(payload));
      }
    }

    this._saveState({ lastKnownGoodTime: now });

    // Persist local copy for MACHINE-bound licenses read from USB or bundled.
    if ((payload.bindingType === 'MACHINE' || !payload.bindingType) && source.source !== 'local') {
      try {
        const localPath = path.join(this.app.getPath('userData'), this.getLicenseFileName());
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, source.content, 'utf8');
      } catch (err) {
        // non-fatal
      }
    }

    return this._ok(this._toLicenseView(payload));
  }

  async _checkBinding(payload, source) {
    const machineFingerprint = await getMachineFingerprint();
    const bindingType = payload.bindingType || 'MACHINE';

    const machineOk = () => {
      if (bindingType !== 'MACHINE' && bindingType !== 'HYBRID') return { ok: true };
      if (!payload.machineFingerprint) return { ok: false, reason: 'ACTIVATION_REQUIRED' };
      if (payload.machineFingerprint !== machineFingerprint) return { ok: false, reason: 'MACHINE_MISMATCH' };
      return { ok: true };
    };

    if (bindingType === 'MACHINE') return machineOk();

    // USB / HYBRID require the carrier drive present AND matching.
    if (source.source !== 'usb') return { ok: false, reason: 'USB_NOT_FOUND' };
    const drive = source.drive;
    if (!drive || !drive.deviceId) return { ok: false, reason: 'USB_NOT_FOUND' };
    if (!payload.usbDeviceId) {
      // Carrier present but not yet bound -> activation required.
      if (bindingType === 'USB') return { ok: false, reason: 'ACTIVATION_REQUIRED' };
      return machineOk();
    }
    if (drive.deviceId !== payload.usbDeviceId) return { ok: false, reason: 'USB_MISMATCH' };

    if (bindingType === 'HYBRID') return machineOk();
    return { ok: true };
  }

  /**
   * Best-effort online refresh. Returns a canonical result or null.
   */
  async _tryOnlineRefresh(payload, source) {
    const serverUrl = this.getServerUrl();
    if (!serverUrl) return null;
    try {
      const machineFingerprint = await getMachineFingerprint();
      const body = { machineFingerprint };
      if (source && source.drive) body.usbDeviceId = source.drive.deviceId;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const validateUrl = this._apiUrl(`licenses/${encodeURIComponent(payload.licenseId)}/validate`);
      if (!validateUrl) return null;
      const res = await fetch(validateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!res.ok) return null;
      const json = await res.json();
      const data = json.data || json;
      return this._result(
        data.isValid === true,
        data.status || null,
        data.reason || null,
        this._toLicenseView(payload)
      );
    } catch (err) {
      return null;
    }
  }

  /**
   * Attempt activation (binding) with the license server. On success the
   * re-signed license file is persisted locally (MACHINE) or reported to the
   * caller for USB writing.
   */
  async activate() {
    const source = await this._findLicenseSource(null);
    if (!source) return this._result(false, 'NO_LICENSE', 'NO_LICENSE', null);

    const parseResult = this._parse(source.content);
    if (!parseResult.ok) return this._result(false, null, parseResult.reason, null);
    const { payload } = parseResult.parsed;

    const serverUrl = this.getServerUrl();
    if (!serverUrl) {
      return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
    }

    try {
      const machineFingerprint = await getMachineFingerprint();
      const usbDeviceId = source.drive ? source.drive.deviceId : null;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      const activateUrl = this._apiUrl(`licenses/${encodeURIComponent(payload.licenseId)}/activate`);
      if (!activateUrl) return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
      const res = await fetch(activateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineFingerprint, usbDeviceId }),
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
      const json = await res.json();

      // Fetch the re-signed file with the bound identity.
      const fileUrl = this._apiUrl(`licenses/${encodeURIComponent(payload.licenseId)}/generate-file`);
      if (!fileUrl) return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
      const fileRes = await fetch(fileUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ machineFingerprint, usbDeviceId }),
        signal: controller.signal
      });
      if (!fileRes.ok) return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
      const fileJson = await fileRes.json();
      const fileData = fileJson.data || fileJson;

      const bindingType = payload.bindingType || 'MACHINE';
      if (bindingType === 'MACHINE') {
        const localPath = path.join(this.app.getPath('userData'), this.getLicenseFileName());
        fs.mkdirSync(path.dirname(localPath), { recursive: true });
        fs.writeFileSync(localPath, fileData.content, 'utf8');
      }

      // Write the re-signed (bound) file back to the USB drive so subsequent
      // launches read the already-bound version and skip activation entirely.
      if ((bindingType === 'USB' || bindingType === 'HYBRID') && source && source.path) {
        try {
          fs.writeFileSync(source.path, fileData.content, 'utf8');
        } catch (writeErr) {
          console.error('[LicenseVerifier] failed to write bound license back to USB:', writeErr.message);
        }
      }

      const newParsed = this._parse(fileData.content);
      this._saveState({ lastKnownGoodTime: Date.now() });
      if (newParsed.ok) {
        return this._result(true, 'ACTIVATED', null, this._toLicenseView(newParsed.parsed.payload));
      }
      return this._result(true, 'ACTIVATED', null, this._toLicenseView(payload));
    } catch (err) {
      return this._result(false, 'ACTIVATION_REQUIRED', 'ACTIVATION_REQUIRED', this._toLicenseView(payload));
    }
  }

  _toLicenseView(payload) {
    if (!payload) return null;
    return {
      licenseKey: payload.licenseKey,
      clientName: payload.clientName,
      clientId: payload.clientId,
      sector: payload.sector,
      licenseType: payload.licenseType,
      bindingType: payload.bindingType,
      machineFingerprint: payload.machineFingerprint,
      usbDeviceId: payload.usbDeviceId,
      expirationDate: payload.expirationDate,
      issuedAt: payload.issuedAt,
      status: payload.status,
      modules: payload.modules || []
    };
  }
}

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

module.exports = LicenseVerifier;
