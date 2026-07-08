const crypto = require('crypto');
const CryptoJS = require('crypto-js');

// Générer une clé de licence unique
function generateLicenseKey() {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(8).toString('hex');
  return `POS-${timestamp}-${random}`.toUpperCase();
}

// Créer un hash de machine pour lier la licence au matériel
function generateMachineId() {
  const os = require('os');
  const crypto = require('crypto');
  
  const machineInfo = {
    platform: os.platform(),
    arch: os.arch(),
    hostname: os.hostname(),
    cpus: os.cpus().length,
    totalmem: os.totalmem()
  };
  
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(machineInfo))
    .digest('hex')
    .substring(0, 16);
}

// Chiffrer le contenu de la licence
function encryptLicenseData(data, key = null) {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key-here';
  
  if (encryptionKey.length !== 32) {
    throw new Error('Encryption key must be exactly 32 characters long');
  }
  
  const encrypted = CryptoJS.AES.encrypt(JSON.stringify(data), encryptionKey).toString();
  return encrypted;
}

// Déchiffrer le contenu de la licence
function decryptLicenseData(encryptedData, key = null) {
  const encryptionKey = key || process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key-here';
  
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedData, encryptionKey);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
    return JSON.parse(decryptedString);
  } catch (error) {
    throw new Error('Failed to decrypt license data: ' + error.message);
  }
}

// Créer une signature pour vérifier l'intégrité
function createSignature(data, secret = null) {
  const signingSecret = secret || process.env.JWT_SECRET || 'default-signing-secret';
  return crypto
    .createHmac('sha256', signingSecret)
    .update(JSON.stringify(data))
    .digest('hex');
}

// Vérifier la signature
function verifySignature(data, signature, secret = null) {
  const expectedSignature = createSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Créer le fichier de licence complet
async function createLicenseFile(license) {
  try {
    // Préparer les données de la licence
    const licenseData = {
      licenseKey: license.licenseKey,
      clientId: license.clientId,
      clientName: license.client.name,
      sector: license.sector,
      licenseType: license.licenseType,
      bindingType: license.bindingType || 'MACHINE',
      expirationDate: license.expirationDate,
      isActive: license.isActive,
      machineId: license.machineId,
      usbSerialNumber: license.usbSerialNumber || null,
      isActivated: license.isActivated || false,
      activatedAt: license.activatedAt || null,
      lastValidatedAt: license.lastValidatedAt || null,
      createdAt: license.createdAt,
      modules: license.modules.map(lm => ({
        id: lm.module.id,
        name: lm.module.name,
        displayName: lm.module.displayName,
        category: lm.module.category,
        isCore: lm.module.isCore,
        isEnabled: lm.isEnabled
      })),
      configuration: license.configuration ? {
        businessName: license.configuration.businessName,
        logo: license.configuration.logo,
        primaryColor: license.configuration.primaryColor,
        secondaryColor: license.configuration.secondaryColor,
        accentColor: license.configuration.accentColor,
        backgroundColor: license.configuration.backgroundColor,
        textColor: license.configuration.textColor,
        currency: license.configuration.currency,
        taxRate: license.configuration.taxRate,
        language: license.configuration.language,
        timezone: license.configuration.timezone
      } : null,
      generatedAt: new Date().toISOString(),
      version: '1.0.0'
    };

    // Créer la signature
    const signature = createSignature(licenseData);

    // Préparer le contenu final
    const finalContent = {
      data: licenseData,
      signature: signature,
      checksum: crypto
        .createHash('sha256')
        .update(JSON.stringify(licenseData))
        .digest('hex')
    };

    // Chiffrer le contenu
    const encryptedContent = encryptLicenseData(finalContent);

    return encryptedContent;
  } catch (error) {
    throw new Error('Failed to create license file: ' + error.message);
  }
}

// Valider et décrypter un fichier de licence
async function validateLicenseFile(encryptedContent) {
  try {
    // Déchiffrer le contenu
    const decryptedContent = decryptLicenseData(encryptedContent);

    if (!decryptedContent.data || !decryptedContent.signature || !decryptedContent.checksum) {
      throw new Error('Invalid license file format');
    }

    const { data, signature, checksum } = decryptedContent;

    // Vérifier le checksum
    const expectedChecksum = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');

    if (checksum !== expectedChecksum) {
      throw new Error('License file has been tampered with (checksum mismatch)');
    }

    // Vérifier la signature
    if (!verifySignature(data, signature)) {
      throw new Error('License file has been tampered with (signature mismatch)');
    }

    // Vérifier la date d'expiration
    if (data.licenseType === 'SUBSCRIPTION' && data.expirationDate) {
      const expirationDate = new Date(data.expirationDate);
      const now = new Date();
      
      if (now > expirationDate) {
        throw new Error('License has expired');
      }
    }

    // Vérifier que la licence est active
    if (!data.isActive) {
      throw new Error('License is not active');
    }

    return {
      isValid: true,
      data: data,
      message: 'License is valid'
    };
  } catch (error) {
    return {
      isValid: false,
      data: null,
      message: error.message
    };
  }
}

// Vérifier la liaison machine (optionnel)
function validateMachineBinding(licenseData, currentMachineId = null) {
  if (!licenseData.machineId) {
    // Pas de liaison machine configurée
    return { isValid: true, message: 'No machine binding configured' };
  }

  const machineId = currentMachineId || generateMachineId();
  
  if (licenseData.machineId !== machineId) {
    return {
      isValid: false,
      message: 'License is bound to a different machine'
    };
  }

  return { isValid: true, message: 'Machine binding is valid' };
}

module.exports = {
  generateLicenseKey,
  generateMachineId,
  encryptLicenseData,
  decryptLicenseData,
  createSignature,
  verifySignature,
  createLicenseFile,
  validateLicenseFile,
  validateMachineBinding
};

