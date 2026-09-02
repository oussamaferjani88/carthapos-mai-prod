'use strict';

/**
 * LicenseService V2 — production-grade CarthaPos licensing.
 *
 * Responsibilities:
 *  - License creation + issuance (lifecycle CREATED -> ISSUED)
 *  - Ed25519 signing of the canonical license payload (backend-only private key)
 *  - Machine / USB / Hybrid binding + activation
 *  - Lifecycle actions (suspend/resume/revoke/renew/extend/transfer/replace)
 *  - Server-side validation (returns { isValid, status, reason, license })
 *  - Full audit trail (activation / validation / transfer history)
 *
 * The generic update endpoint is intentionally restrictive: security-sensitive
 * fields (binding, status, signature, payload) can ONLY be changed through the
 * dedicated lifecycle methods below.
 */

const crypto = require('crypto');
const licenseRepository = require('../repositories/licenseRepository');
const clientRepository = require('../repositories/clientRepository');
const moduleRepository = require('../repositories/moduleRepository');
const { NotFoundError, ValidationError } = require('../utils/errors');
const licenseCrypto = require('./license/crypto');
const { getPrivateKey, getPublicKey } = require('./license/keys');

const VALID_BINDING_TYPES = ['MACHINE', 'USB', 'HYBRID'];
const SECURITY_SENSITIVE_FIELDS = [
  'machineId',
  'machineFingerprint',
  'activatedMachineId',
  'usbSerialNumber',
  'usbDeviceId',
  'isActivated',
  'activatedAt',
  'status',
  'signature',
  'signedLicensePayload',
  'publicKeyFingerprint',
  'activationCount',
  'transferCount',
  'maxTransfers',
  'legacy',
  'licenseVersion',
  'lastValidationResult',
];

class LicenseService {
  // ──────────────────────────────────────────────────────────────
  // Lookups
  // ──────────────────────────────────────────────────────────────

  async getAllLicenses({ clientId } = {}) {
    return await licenseRepository.findAll({
      where: clientId ? { clientId } : undefined,
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getLicenseById(id, { withDetails = true } = {}) {
    const include = withDetails
      ? {
          client: true,
          modules: { include: { module: true } },
          configuration: true
        }
      : undefined;
    const license = await licenseRepository.findById(id, { include });
    if (!license) {
      throw new NotFoundError('License');
    }
    return license;
  }

  async getLicenseByKey(licenseKey) {
    const license = await licenseRepository.findByKey(licenseKey);
    if (!license) {
      throw new NotFoundError('License');
    }
    return license;
  }

  async getClientLicenses(clientId) {
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client');
    }
    return await licenseRepository.findByClientId(clientId);
  }

  async getLicenseHistory(id) {
    await this.getLicenseById(id, { withDetails: false });
    return await licenseRepository.getHistory(id);
  }

  // ──────────────────────────────────────────────────────────────
  // Creation / issue
  // ──────────────────────────────────────────────────────────────

  async createLicense(data) {
    const {
      clientId,
      sector,
      licenseType,
      expirationDate,
      bindingType = 'MACHINE',
      configuration,
      createdBy = 'admin',
      autoIssue = true
    } = data;
    const moduleIds = data.moduleIds || data.modules || [];

    if (!clientId || !sector || !licenseType) {
      throw new ValidationError('clientId, sector and licenseType are required');
    }
    if (!VALID_BINDING_TYPES.includes(bindingType)) {
      throw new ValidationError(`bindingType must be one of: ${VALID_BINDING_TYPES.join(', ')}`);
    }

    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new NotFoundError('Client');
    }

    if (licenseType === 'SUBSCRIPTION' && !expirationDate) {
      throw new ValidationError('Expiration date is required for subscription licenses');
    }

    const licenseKey = this.generateLicenseKey();
    const now = new Date();

    const license = await licenseRepository.create({
      clientId,
      licenseKey,
      sector,
      licenseType,
      expirationDate: licenseType === 'SUBSCRIPTION' ? new Date(expirationDate) : null,
      bindingType,
      isActive: true,
      status: 'ISSUED',
      issuedAt: now,
      createdBy,
      legacy: false,
      licenseVersion: 1
    });

    // Attach modules (accept ids or names)
    const resolvedModuleIds = await this._resolveModuleIds(moduleIds);
    await moduleRepository.attachToLicense(license.id, resolvedModuleIds);

    // Attach configuration
    if (configuration && Object.keys(configuration).length > 0) {
      await licenseRepository.updateConfiguration(license.id, {
        businessName: configuration.businessName || client.name || 'Mon Entreprise',
        ...configuration
      });
    }

    await licenseRepository.createActivationHistory({
      licenseId: license.id,
      action: autoIssue ? 'ISSUE' : 'CREATE',
      fromStatus: 'CREATED',
      toStatus: 'ISSUED',
      performedBy: createdBy,
      details: { sector, licenseType, bindingType }
    });

    if (autoIssue) {
      try {
        await this.generateLicenseFile(license.id);
      } catch (err) {
        console.error('[licenseService] auto-issue signing failed (continuing):', err.message);
      }
    }

    return await this.getLicenseById(license.id);
  }

  async _resolveModuleIds(moduleIds) {
    const unique = [...new Set(moduleIds || [])];
    if (unique.length === 0) {
      const coreModules = await moduleRepository.findCoreModules();
      return coreModules.map((m) => m.id);
    }
    const byId = await moduleRepository.findAll({ where: { id: { in: unique } } });
    const foundIds = new Set(byId.map((m) => m.id));
    const remainingNames = unique.filter((id) => !foundIds.has(id));
    let byName = [];
    if (remainingNames.length > 0) {
      byName = await moduleRepository.findAll({ where: { name: { in: remainingNames } } });
    }
    return [...new Set([...byId.map((m) => m.id), ...byName.map((m) => m.id)])];
  }

  // ──────────────────────────────────────────────────────────────
  // Generic updates (restricted)
  // ──────────────────────────────────────────────────────────────

  async updateLicense(id, data) {
    await this.getLicenseById(id, { withDetails: false });

    const sensitive = SECURITY_SENSITIVE_FIELDS.filter((f) => f in data);
    if (sensitive.length > 0) {
      throw new ValidationError(
        `Security-sensitive field(s) cannot be updated via generic update: ${sensitive.join(', ')}. Use the dedicated license endpoints.`
      );
    }

    const updateData = {};
    if (data.sector !== undefined) updateData.sector = data.sector;
    if (data.licenseType !== undefined) {
      if (!['SUBSCRIPTION', 'LIFETIME'].includes(data.licenseType)) {
        throw new ValidationError('licenseType must be SUBSCRIPTION or LIFETIME');
      }
      updateData.licenseType = data.licenseType;
    }
    if (data.expirationDate !== undefined) {
      updateData.expirationDate = data.expirationDate ? new Date(data.expirationDate) : null;
    }

    return await licenseRepository.update(id, updateData);
  }

  async updateConfiguration(licenseId, configData) {
    await this.getLicenseById(licenseId, { withDetails: false });
    return await licenseRepository.updateConfiguration(licenseId, configData);
  }

  async toggleLicenseStatus(id) {
    const license = await this.getLicenseById(id, { withDetails: false });
    const nextActive = !license.isActive;
    const updated = await licenseRepository.update(id, { isActive: nextActive });
    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: nextActive ? 'REACTIVATE' : 'DEACTIVATE',
      fromStatus: license.status,
      toStatus: nextActive ? 'ACTIVE' : 'SUSPENDED',
      performedBy: 'admin',
      details: { isActive: nextActive }
    });
    return updated;
  }

  async deleteLicense(id) {
    await this.getLicenseById(id, { withDetails: false });
    return await licenseRepository.delete(id);
  }

  async getActiveLicenses() {
    return await licenseRepository.findActiveLicenses();
  }

  async getExpiringSoon(days = 30) {
    return await licenseRepository.findExpiringSoon(days);
  }

  generateLicenseKey() {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(4).toString('hex').toUpperCase());
    }
    return segments.join('-');
  }

  // ──────────────────────────────────────────────────────────────
  // Signing / license file generation
  // ──────────────────────────────────────────────────────────────

  buildSignedPayload(license) {
    const modules = (license.modules || []).map((lm) => ({
      id: lm.module ? lm.module.id : lm.id,
      name: lm.module ? lm.module.name : lm.name,
      displayName: lm.module ? lm.module.displayName : lm.displayName,
      category: lm.module ? lm.module.category : lm.category,
      isCore: lm.module ? lm.module.isCore : lm.isCore,
      isEnabled: lm.isEnabled
    }));

    const config = license.configuration || {};
    const payload = {
      version: 1,
      licenseId: license.id,
      licenseKey: license.licenseKey,
      clientId: license.clientId,
      clientName: license.client ? license.client.name : null,
      sector: license.sector,
      licenseType: license.licenseType,
      bindingType: license.bindingType || 'MACHINE',
      machineFingerprint: license.machineFingerprint || null,
      usbDeviceId: license.usbDeviceId || null,
      modules,
      configuration: {
        businessName: config.businessName || null,
        logo: config.logo || null,
        currency: config.currency || null,
        language: config.language || null,
        timezone: config.timezone || null,
        taxRate: config.taxRate != null ? config.taxRate : null
      },
      issuedAt: license.issuedAt ? new Date(license.issuedAt).toISOString() : null,
      expirationDate: license.expirationDate ? new Date(license.expirationDate).toISOString() : null,
      status: license.status || 'ISSUED'
    };
    return payload;
  }

  /**
   * Generate (or regenerate) the signed license file for a license.
   * Optionally binds machine/usb identity at issuance time.
   */
  async generateLicenseFile(id, { machineId, machineFingerprint, usbDeviceId } = {}) {
    const license = await this.getLicenseById(id);
    const privateKey = getPrivateKey();
    const publicKey = getPublicKey();
    const fingerprint = licenseCrypto.fingerprintPublicKey(publicKey);

    const bindingType = license.bindingType || 'MACHINE';
    const mfp = machineFingerprint || machineId || license.machineFingerprint || null;
    const udid = usbDeviceId || license.usbDeviceId || null;

    const licenseUpdate = {};

    if (mfp) {
      licenseUpdate.machineFingerprint = mfp;
      if (machineId) licenseUpdate.machineId = machineId;
    }
    if (udid) {
      licenseUpdate.usbDeviceId = udid;
      if (bindingType === 'USB' && license.usbSerialNumber && license.usbSerialNumber !== udid) {
        // keep usbSerialNumber as-is unless explicitly provided
      }
      licenseUpdate.usbSerialNumber = license.usbSerialNumber || udid;
    }
    if (license.status === 'CREATED' || license.status === 'ISSUED') {
      licenseUpdate.status = 'ISSUED';
      licenseUpdate.issuedAt = license.issuedAt || new Date();
    }

    // Re-read the updated license before signing
    let toSign;
    if (Object.keys(licenseUpdate).length > 0) {
      await licenseRepository.update(id, licenseUpdate);
      toSign = await this.getLicenseById(id);
    } else {
      toSign = license;
    }

    const payload = this.buildSignedPayload(toSign);
    const signature = licenseCrypto.signPayload(payload, privateKey);

    await licenseRepository.update(id, {
      signature,
      signedLicensePayload: payload,
      publicKeyFingerprint: fingerprint,
      status: payload.status,
      issuedAt: payload.issuedAt ? new Date(payload.issuedAt) : null
    });

    const content = JSON.stringify({
      format: 'carthapos-license',
      version: 1,
      publicKeyFingerprint: fingerprint,
      payload,
      signature
    }, null, 2);

    return {
      filename: `license-${license.licenseKey}.key`,
      content,
      licenseKey: license.licenseKey,
      signature,
      publicKeyFingerprint: fingerprint,
      payload
    };
  }

  async regenerateSignature(id, performedBy = 'admin') {
    await this.getLicenseById(id, { withDetails: false });
    const file = await this.generateLicenseFile(id);
    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: 'REGENERATE',
      fromStatus: null,
      toStatus: null,
      performedBy,
      details: { publicKeyFingerprint: file.publicKeyFingerprint }
    });
    return file;
  }

  // ──────────────────────────────────────────────────────────────
  // Activation / binding
  // ──────────────────────────────────────────────────────────────

  async activateLicense(id, { machineFingerprint, usbDeviceId, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id);

    if (license.legacy) {
      throw new ValidationError('Legacy license: re-issue via the admin panel before activation');
    }
    if (license.status === 'REVOKED' || license.status === 'REPLACED') {
      throw new ValidationError(`License is ${license.status} and cannot be activated`);
    }
    if (license.status === 'SUSPENDED') {
      throw new ValidationError('Suspended licenses cannot be activated');
    }
    if (license.status === 'EXPIRED') {
      throw new ValidationError('Expired licenses cannot be activated');
    }

    const bindingType = license.bindingType || 'MACHINE';
    if (bindingType === 'MACHINE' && !machineFingerprint) {
      throw new ValidationError('machineFingerprint is required for MACHINE-bound licenses');
    }
    if (bindingType === 'USB' && !usbDeviceId) {
      throw new ValidationError('usbDeviceId is required for USB-bound licenses');
    }
    if (bindingType === 'HYBRID' && (!machineFingerprint || !usbDeviceId)) {
      throw new ValidationError('Both machineFingerprint and usbDeviceId are required for HYBRID-bound licenses');
    }

    const alreadyBoundToDifferentMachine =
      license.machineFingerprint && license.machineFingerprint !== machineFingerprint;
    const alreadyBoundToDifferentUsb =
      license.usbDeviceId && license.usbDeviceId !== usbDeviceId;

    if (alreadyBoundToDifferentMachine || alreadyBoundToDifferentUsb) {
      throw new ValidationError(
        'License is already bound to a different machine/USB device. Use transfer to move it.'
      );
    }

    const updated = await licenseRepository.update(id, {
      machineFingerprint: machineFingerprint || license.machineFingerprint || null,
      usbDeviceId: usbDeviceId || license.usbDeviceId || null,
      isActivated: true,
      activatedAt: new Date(),
      activationCount: (license.activationCount || 0) + 1,
      lastValidatedAt: new Date(),
      status: 'ACTIVATED',
      lastValidationResult: 'ACTIVATED'
    });

    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: 'ACTIVATE',
      fromStatus: license.status,
      toStatus: 'ACTIVATED',
      performedBy,
      details: { bindingType, machineFingerprint, usbDeviceId }
    });

    // Re-sign so the payload reflects the bound identity + ACTIVE status
    await this.generateLicenseFile(id);

    return await this.getLicenseById(id);
  }

  async deactivateLicense(id, { performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id);
    const updated = await licenseRepository.update(id, {
      isActivated: false,
      activatedAt: null,
      status: 'ISSUED'
    });
    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: 'DEACTIVATE',
      fromStatus: license.status,
      toStatus: 'ISSUED',
      performedBy,
      details: {}
    });
    return updated;
  }

  // ──────────────────────────────────────────────────────────────
  // Lifecycle
  // ──────────────────────────────────────────────────────────────

  async _transition(id, { action, fromStatus, toStatus, performedBy, details = {}, extraData = {} }) {
    const updated = await licenseRepository.update(id, {
      ...extraData,
      status: toStatus
    });
    await licenseRepository.createActivationHistory({
      licenseId: id,
      action,
      fromStatus: fromStatus || null,
      toStatus,
      performedBy: performedBy || 'admin',
      details
    });
    return updated;
  }

  async suspendLicense(id, { reason, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id, { withDetails: false });
    if (license.status === 'SUSPENDED') return license;
    return await this._transition(id, {
      action: 'SUSPEND',
      fromStatus: license.status,
      toStatus: 'SUSPENDED',
      performedBy,
      details: { reason },
      extraData: { suspendedAt: new Date(), isActive: false }
    });
  }

  async resumeLicense(id, { performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id, { withDetails: false });
    if (license.status !== 'SUSPENDED') {
      throw new ValidationError('Only suspended licenses can be resumed');
    }
    return await this._transition(id, {
      action: 'RESUME',
      fromStatus: 'SUSPENDED',
      toStatus: 'ACTIVE',
      performedBy,
      details: {},
      extraData: { suspendedAt: null, isActive: true }
    });
  }

  async revokeLicense(id, { reason, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id, { withDetails: false });
    if (license.status === 'REVOKED') return license;
    return await this._transition(id, {
      action: 'REVOKE',
      fromStatus: license.status,
      toStatus: 'REVOKED',
      performedBy,
      details: { reason },
      extraData: { revokedAt: new Date(), isActive: false }
    });
  }

  async renewLicense(id, { expirationDate, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id, { withDetails: false });
    if (license.licenseType !== 'SUBSCRIPTION') {
      throw new ValidationError('Only subscription licenses can be renewed');
    }
    if (!expirationDate) {
      throw new ValidationError('expirationDate is required for renewal');
    }
    const updated = await this._transition(id, {
      action: 'RENEW',
      fromStatus: license.status,
      toStatus: license.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE',
      performedBy,
      details: { previousExpiration: license.expirationDate, newExpiration: expirationDate },
      extraData: {
        expirationDate: new Date(expirationDate),
        renewedAt: new Date(),
        isActive: true,
        status: license.status === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE'
      }
    });
    return updated;
  }

  async extendLicense(id, { days, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id, { withDetails: false });
    if (license.licenseType !== 'SUBSCRIPTION') {
      throw new ValidationError('Only subscription licenses can be extended');
    }
    if (!days || days <= 0 || days > 3650) {
      throw new ValidationError('days must be between 1 and 3650');
    }
    const base = license.expirationDate ? new Date(license.expirationDate) : new Date();
    const newExpiration = new Date(base);
    newExpiration.setDate(newExpiration.getDate() + days);
    return await this.renewLicense(id, {
      expirationDate: newExpiration,
      performedBy
    });
  }

  async transferLicense(id, { machineFingerprint, usbDeviceId, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id);
    if (license.legacy) {
      throw new ValidationError('Legacy license: re-issue via the admin panel before transfer');
    }
    if (license.status === 'REVOKED' || license.status === 'REPLACED') {
      throw new ValidationError(`License is ${license.status} and cannot be transferred`);
    }
    if (license.transferCount >= license.maxTransfers) {
      throw new ValidationError(
        `Transfer limit reached (${license.maxTransfers}). Replace or re-issue the license.`
      );
    }
    if (!machineFingerprint && !usbDeviceId) {
      throw new ValidationError('Provide a new machineFingerprint and/or usbDeviceId to transfer to');
    }

    const fromMfp = license.machineFingerprint || null;
    const fromUsb = license.usbDeviceId || null;

    const updated = await licenseRepository.update(id, {
      machineFingerprint: machineFingerprint || null,
      usbDeviceId: usbDeviceId || null,
      machineId: null,
      transferCount: (license.transferCount || 0) + 1,
      isActivated: machineFingerprint || usbDeviceId ? true : license.isActivated,
      activatedAt: machineFingerprint || usbDeviceId ? new Date() : license.activatedAt,
      lastValidatedAt: new Date(),
      status: 'ACTIVE'
    });

    await licenseRepository.createTransferHistory({
      licenseId: id,
      transferType: usbDeviceId ? (machineFingerprint ? 'HYBRID' : 'USB') : 'MACHINE',
      fromMachineFingerprint: fromMfp,
      toMachineFingerprint: machineFingerprint || null,
      fromUsbDeviceId: fromUsb,
      toUsbDeviceId: usbDeviceId || null,
      authorizedBy: performedBy,
      details: {}
    });

    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: 'TRANSFER',
      fromStatus: license.status,
      toStatus: 'ACTIVE',
      performedBy,
      details: { transferCount: (license.transferCount || 0) + 1 }
    });

    await this.generateLicenseFile(id);
    return await this.getLicenseById(id);
  }

  async resetBinding(id, { performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id);
    const updated = await licenseRepository.update(id, {
      machineFingerprint: null,
      usbDeviceId: null,
      machineId: null,
      isActivated: false,
      activatedAt: null,
      status: 'ISSUED'
    });
    await licenseRepository.createActivationHistory({
      licenseId: id,
      action: 'RESET_BINDING',
      fromStatus: license.status,
      toStatus: 'ISSUED',
      performedBy,
      details: { wasMachine: license.machineFingerprint, wasUsb: license.usbDeviceId }
    });
    await this.generateLicenseFile(id);
    return updated;
  }

  async replaceLicense(id, { clientId, sector, licenseType, expirationDate, moduleIds, configuration, performedBy = 'admin' } = {}) {
    const license = await this.getLicenseById(id);

    const newLicense = await this.createLicense({
      clientId: clientId || license.clientId,
      sector: sector || license.sector,
      licenseType: licenseType || license.licenseType,
      expirationDate: expirationDate || license.expirationDate,
      moduleIds: moduleIds || (license.modules || []).map((m) => m.moduleId || m.id),
      configuration: configuration || (license.configuration ? { ...license.configuration } : undefined),
      bindingType: license.bindingType,
      createdBy: performedBy
    });

    await this._transition(id, {
      action: 'REPLACE',
      fromStatus: license.status,
      toStatus: 'REPLACED',
      performedBy,
      details: { newLicenseId: newLicense.id, newLicenseKey: newLicense.licenseKey },
      extraData: { replacedAt: new Date(), replacedById: newLicense.id, isActive: false }
    });

    return { old: await this.getLicenseById(id), replacement: newLicense };
  }

  // ──────────────────────────────────────────────────────────────
  // Server-side validation (used by POS activation / validation IPC)
  // ──────────────────────────────────────────────────────────────

  async validateLicense(id, { machineFingerprint, usbDeviceId } = {}) {
    const license = await this.getLicenseById(id);
    const now = new Date();
    const result = { isValid: false, status: license.status, reason: null, license };

    if (!license.isActive || license.status === 'REVOKED' || license.status === 'REPLACED') {
      result.status = license.status;
      if (license.status === 'REVOKED') {
        result.reason = 'REVOKED';
      } else if (license.status === 'REPLACED') {
        result.reason = 'REVOKED';
      } else {
        result.reason = 'SUSPENDED';
      }
      return this._persistValidation(id, result);
    }

    if (license.status === 'SUSPENDED') {
      result.reason = 'SUSPENDED';
      return this._persistValidation(id, result);
    }

    if (license.licenseType === 'SUBSCRIPTION' && license.expirationDate && now > license.expirationDate) {
      result.reason = 'EXPIRED';
      result.status = 'EXPIRED';
      await licenseRepository.update(id, { status: 'EXPIRED', lastValidationResult: 'EXPIRED' });
      return this._persistValidation(id, result);
    }

    if (license.bindingType === 'MACHINE' || license.bindingType === 'HYBRID') {
      if (!machineFingerprint) {
        result.reason = 'MACHINE_MISMATCH';
        return this._persistValidation(id, result);
      }
      if (license.machineFingerprint && license.machineFingerprint !== machineFingerprint) {
        result.reason = 'MACHINE_MISMATCH';
        return this._persistValidation(id, result);
      }
    }

    if (license.bindingType === 'USB' || license.bindingType === 'HYBRID') {
      if (!usbDeviceId) {
        result.reason = 'USB_NOT_FOUND';
        return this._persistValidation(id, result);
      }
      if (license.usbDeviceId && license.usbDeviceId !== usbDeviceId) {
        result.reason = 'USB_MISMATCH';
        return this._persistValidation(id, result);
      }
    }

    result.isValid = true;
    result.status = 'ACTIVE';
    await licenseRepository.update(id, {
      status: 'ACTIVE',
      isActive: true,
      lastValidatedAt: now,
      lastValidationResult: 'VALID'
    });

    return this._persistValidation(id, result);
  }

  async _persistValidation(id, result) {
    await licenseRepository.createValidationLog({
      licenseId: id,
      isValid: result.isValid,
      reason: result.reason || null,
      status: result.status || null,
      details: { isValid: result.isValid }
    });
    return result;
  }

  // ──────────────────────────────────────────────────────────────
  // Modules
  // ──────────────────────────────────────────────────────────────

  async attachModule(licenseId, moduleId) {
    await this.getLicenseById(licenseId, { withDetails: false });
    const module = await moduleRepository.findById(moduleId);
    if (!module) {
      throw new NotFoundError('Module');
    }
    await moduleRepository.attachToLicense(licenseId, [moduleId]);
    return await this.getLicenseById(licenseId);
  }

  async detachModule(licenseId, moduleId) {
    await this.getLicenseById(licenseId, { withDetails: false });
    await moduleRepository.detachFromLicense(licenseId, moduleId);
    return await this.getLicenseById(licenseId);
  }

  async toggleModule(licenseId, moduleId, isEnabled) {
    await this.getLicenseById(licenseId, { withDetails: false });
    await moduleRepository.toggleModule(licenseId, moduleId, isEnabled);
    return await this.getLicenseById(licenseId);
  }
}

module.exports = new LicenseService();
