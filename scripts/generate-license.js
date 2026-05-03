#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const CryptoJS = require('crypto-js');

/**
 * Script de génération de fichier de licence
 * 
 * Ce script génère un fichier license.key chiffré contenant
 * les informations de licence pour une application POS.
 */

class LicenseGenerator {
  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || '1234567890abcdef1234567890abcdef';
    this.signingSecret = process.env.JWT_SECRET || 'b7f$2!kL9@xQz8#pR1wT6^eV0sN4uJ3mZ5cG7hB2lA0dF6qW';
  }

  /**
   * Génère un fichier de licence chiffré
   * @param {Object} licenseData - Données de la licence
   * @param {string} outputPath - Chemin de sortie du fichier
   */
  generateLicenseFile(licenseData, outputPath) {
    console.log('🔐 Génération du fichier de licence...');
    
    try {
      // 1. Valider les données de licence
      this.validateLicenseData(licenseData);
      
      // 2. Créer le checksum
      const checksum = this.createChecksum(licenseData);
      
      // 3. Créer la signature
      const signature = this.createSignature(licenseData);
      
      // 4. Créer l'objet final
      const licenseObject = {
        data: licenseData,
        checksum: checksum,
        signature: signature,
        generatedAt: new Date().toISOString(),
        version: '1.0'
      };
      
      // 5. Chiffrer le contenu
      const encryptedContent = this.encryptLicense(licenseObject);
      
      // 6. Écrire le fichier
      fs.writeFileSync(outputPath, encryptedContent, 'utf8');
      
      console.log('✅ Fichier de licence généré avec succès !');
      console.log(`📄 Fichier: ${outputPath}`);
      console.log(`🔑 Clé: ${licenseData.licenseKey}`);
      
      return {
        success: true,
        filePath: outputPath,
        licenseKey: licenseData.licenseKey
      };
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      throw error;
    }
  }

  validateLicenseData(data) {
    const required = ['licenseKey', 'clientName', 'sector', 'licenseType', 'isActive'];
    
    for (const field of required) {
      if (!data[field]) {
        throw new Error(`Champ requis manquant: ${field}`);
      }
    }
    
    if (!['LIFETIME', 'SUBSCRIPTION'].includes(data.licenseType)) {
      throw new Error('Type de licence invalide. Doit être LIFETIME ou SUBSCRIPTION');
    }
    
    if (data.licenseType === 'SUBSCRIPTION' && !data.expirationDate) {
      throw new Error('Date d\'expiration requise pour les licences d\'abonnement');
    }
    
    if (!Array.isArray(data.modules)) {
      throw new Error('Les modules doivent être un tableau');
    }
  }

  createChecksum(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  createSignature(data) {
    return crypto
      .createHmac('sha256', this.signingSecret)
      .update(JSON.stringify(data))
      .digest('hex');
  }

  encryptLicense(licenseObject) {
    const jsonString = JSON.stringify(licenseObject);
    return CryptoJS.AES.encrypt(jsonString, this.encryptionKey).toString();
  }

  /**
   * Vérifie et déchiffre un fichier de licence
   * @param {string} filePath - Chemin du fichier de licence
   */
  verifyLicenseFile(filePath) {
    console.log('🔍 Vérification du fichier de licence...');
    
    try {
      // 1. Lire le fichier
      const encryptedContent = fs.readFileSync(filePath, 'utf8');
      
      // 2. Déchiffrer
      const decrypted = CryptoJS.AES.decrypt(encryptedContent, this.encryptionKey);
      const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);
      const licenseObject = JSON.parse(decryptedString);
      
      // 3. Vérifier le checksum
      const expectedChecksum = this.createChecksum(licenseObject.data);
      if (licenseObject.checksum !== expectedChecksum) {
        throw new Error('Checksum invalide - fichier corrompu');
      }
      
      // 4. Vérifier la signature
      const expectedSignature = this.createSignature(licenseObject.data);
      if (!crypto.timingSafeEqual(
        Buffer.from(licenseObject.signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        throw new Error('Signature invalide - fichier modifié');
      }
      
      // 5. Vérifier l'expiration
      if (licenseObject.data.licenseType === 'SUBSCRIPTION' && licenseObject.data.expirationDate) {
        const expirationDate = new Date(licenseObject.data.expirationDate);
        if (new Date() > expirationDate) {
          throw new Error('Licence expirée');
        }
      }
      
      console.log('✅ Licence valide !');
      return {
        valid: true,
        data: licenseObject.data
      };
      
    } catch (error) {
      console.error('❌ Licence invalide:', error.message);
      return {
        valid: false,
        error: error.message
      };
    }
  }

  /**
   * Génère une clé de licence unique
   */
  generateLicenseKey() {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex').toUpperCase();
    return `POS-${timestamp}-${random}`;
  }

  /**
   * Crée un template de licence
   * @param {Object} options - Options de base
   */
  createLicenseTemplate(options = {}) {
    return {
      licenseKey: this.generateLicenseKey(),
      clientName: options.clientName || 'Client Test',
      sector: options.sector || 'restaurant',
      licenseType: options.licenseType || 'LIFETIME',
      isActive: true,
      expirationDate: options.licenseType === 'SUBSCRIPTION' 
        ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // 1 an
        : null,
      modules: options.modules || [
        { name: 'pos-core', displayName: 'Caisse de base', isEnabled: true },
        { name: 'inventory', displayName: 'Gestion des stocks', isEnabled: true },
        { name: 'reports', displayName: 'Rapports', isEnabled: true }
      ],
      features: options.features || {
        maxUsers: options.licenseType === 'LIFETIME' ? -1 : 5,
        maxProducts: options.licenseType === 'LIFETIME' ? -1 : 1000,
        supportLevel: options.licenseType === 'LIFETIME' ? 'premium' : 'standard'
      },
      generatedBy: 'POS License Generator',
      generatedAt: new Date().toISOString()
    };
  }
}

// Fonction utilitaire pour utilisation en ligne de commande
function generateFromConfig(configFile, outputFile) {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const generator = new LicenseGenerator();
  
  return generator.generateLicenseFile(config, outputFile);
}

// Export pour utilisation en module
module.exports = { LicenseGenerator, generateFromConfig };

// Utilisation en ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];
  
  const generator = new LicenseGenerator();
  
  switch (command) {
    case 'generate':
      if (args.length < 3) {
        console.log('Usage: node generate-license.js generate <config-file> <output-file>');
        process.exit(1);
      }
      
      try {
        generateFromConfig(args[1], args[2]);
      } catch (error) {
        console.error('Erreur:', error.message);
        process.exit(1);
      }
      break;
      
    case 'verify':
      if (args.length < 2) {
        console.log('Usage: node generate-license.js verify <license-file>');
        process.exit(1);
      }
      
      const result = generator.verifyLicenseFile(args[1]);
      if (!result.valid) {
        process.exit(1);
      }
      break;
      
    case 'template':
      const outputFile = args[1] || 'license-template.json';
      const template = generator.createLicenseTemplate();
      fs.writeFileSync(outputFile, JSON.stringify(template, null, 2));
      console.log(`Template créé: ${outputFile}`);
      break;
      
    default:
      console.log('Générateur de licence POS');
      console.log('');
      console.log('Commandes disponibles:');
      console.log('  generate <config-file> <output-file>  - Générer un fichier de licence');
      console.log('  verify <license-file>                 - Vérifier un fichier de licence');
      console.log('  template [output-file]                - Créer un template de licence');
      console.log('');
      console.log('Exemples:');
      console.log('  node generate-license.js template license-config.json');
      console.log('  node generate-license.js generate license-config.json license.key');
      console.log('  node generate-license.js verify license.key');
      break;
  }
}

/**
 * Create Berber salon license for testing
 */
function createBerberLicense() {
  console.log('🧪 Creating Berber salon license for testing...');
  
  const generator = new LicenseGenerator();
  
  const berberLicenseData = {
    licenseKey: 'BERBER-ELITE-2025-SUBSCRIPTION',
    clientId: 'berber-elite-001',
    clientName: 'Salon Berber Elite',
    sector: 'Beauty & Personal Care',
    licenseType: 'SUBSCRIPTION',
    issuedAt: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    isActive: true,
    features: {
      maxUsers: 5,
      maxProducts: 1000,
      allowReports: true,
      allowInventory: true,
      allowLoyalty: true
    },
    modules: [
      {
        name: 'pos-core',
        isEnabled: true
      },
      {
        name: 'inventory',
        isEnabled: true
      },
      {
        name: 'reports',
        isEnabled: true
      },
      {
        name: 'loyalty-program',
        isEnabled: true
      },
      {
        name: 'kitchen-printer',
        isEnabled: false
      },
      {
        name: 'table-management',
        isEnabled: false
      }
    ]
  };

  // Create test-licenses directory
  const licenseDir = path.join(__dirname, '../test-licenses');
  if (!fs.existsSync(licenseDir)) {
    fs.mkdirSync(licenseDir, { recursive: true });
  }

  const licensePath = path.join(licenseDir, 'berber-license.key');
  
  try {
    const success = generator.generateLicenseFile(berberLicenseData, licensePath);
    
    if (success) {
      console.log('\n✅ Berber license created successfully!');
      console.log('📁 Location:', licensePath);
      console.log('\n📋 Instructions:');
      console.log('1. Copy this license file to a USB drive');
      console.log('2. Rename it to "berber-license.key" on the USB');
      console.log('3. Insert USB before launching the POS application');
      console.log('4. The application will validate the license on startup');
      
      // Verify the license
      console.log('\n🔍 Verifying generated license...');
      generator.verifyLicenseFile(licensePath);
    }
  } catch (error) {
    console.error('❌ Failed to create Berber license:', error);
  }
}

// Export for use in other scripts
module.exports = { LicenseGenerator, createBerberLicense };

