#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { POSBuilder } = require('./build-pos.js');

/**
 * Test script to generate a POS for "Berber" client with USB license requirement
 */

async function generateBerberPOS() {
  console.log('🧪 Testing POS generation for Berber client...');

  // Configuration pour le salon de coiffure Berber
  const berberConfig = {
    theme: {
      businessName: 'Salon Berber Elite',
      colors: {
        primary: '#2c3e50',    // Dark blue-gray
        secondary: '#e74c3c',  // Red
        accent: '#f39c12',     // Orange
        background: '#ecf0f1', // Light gray
        text: '#2c3e50'
      },
      logo: null,
      currency: 'EUR',
      taxRate: 20,
      language: 'fr'
    },
    printer: {
      enabled: true,
      autoprint: false,
      paperWidth: 80
    },
    features: {
      barcode: true,
      multiplePaymentMethods: true,
      discounts: true,
      returns: false // Barbershops typically don't do returns
    },
    security: {
      requireUSBLicense: true,  // Enable USB license check
      licenseFileName: 'berber-license.key'
    }
  };

  // Licence avec modules spécifiques au salon de coiffure
  const berberLicense = {
    clientId: 'berber-elite-001',
    clientName: 'Salon Berber Elite',
    licenseType: 'SUBSCRIPTION',
    issuedAt: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year
    isActive: true,
    modules: [
      {
        name: 'pos-core',
        displayName: 'Caisse de base',
        isEnabled: true,
        description: 'Fonctionnalités de base de la caisse'
      },
      {
        name: 'inventory',
        displayName: 'Gestion des stocks',
        isEnabled: true,
        description: 'Gestion des produits et stocks'
      },
      {
        name: 'reports',
        displayName: 'Rapports',
        isEnabled: true,
        description: 'Rapports de ventes et analyses'
      },
      {
        name: 'kitchen-printer',
        displayName: 'Impression cuisine',
        isEnabled: false,
        description: 'Non applicable pour un salon'
      },
      {
        name: 'table-management',
        displayName: 'Gestion des tables',
        isEnabled: false,
        description: 'Non applicable pour un salon'
      },
      {
        name: 'loyalty-program',
        displayName: 'Programme de fidélité',
        isEnabled: true,
        description: 'Programme de fidélité pour clients réguliers'
      }
    ]
  };

  try {
    const builder = new POSBuilder();
    const outputPath = path.join(__dirname, '../generated-pos/salon-berber-elite');
    
    console.log('📍 Output path:', outputPath);
    
    await builder.generatePOS(berberConfig, berberLicense, outputPath);
    
    console.log('🎉 Berber POS generated successfully!');
    console.log('📁 Location:', outputPath);
    console.log('🏪 Business Name:', berberConfig.theme.businessName);
    console.log('🔒 USB License Required:', berberConfig.security.requireUSBLicense);
    
    // Verify the generated config
    const configPath = path.join(outputPath, 'resources/app.asar.unpacked/dist/app-config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Config verified - Business Name:', config.theme?.businessName);
      console.log('✅ License required:', config.security?.requireUSBLicense);
    } else {
      console.log('⚠️ Config file not found at expected location');
      // Try alternative paths
      const altPaths = [
        path.join(outputPath, 'app-config.json'),
        path.join(outputPath, 'dist/app-config.json'),
        path.join(outputPath, 'resources/dist/app-config.json')
      ];
      
      for (const altPath of altPaths) {
        if (fs.existsSync(altPath)) {
          console.log('📁 Found config at:', altPath);
          break;
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error generating Berber POS:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  generateBerberPOS();
}

module.exports = { generateBerberPOS };
