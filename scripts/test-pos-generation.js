const path = require('path');
const { POSBuilder } = require('./build-pos.js');

async function testPOSGeneration() {
  const builder = new POSBuilder();
  
  // Configuration pour le client "Berber"
  const config = {
    theme: {
      businessName: "Salon de Coiffure Berber",
      sector: "salon",
      currency: "EUR",
      taxRate: 20.0,
      language: "fr",
      timezone: "Europe/Paris",
      colors: {
        primary: "#2563eb",
        accent: "#f59e0b",
        background: "#ffffff",
        text: "#1f2937"
      }
    },
    business: {
      name: "Salon de Coiffure Berber",
      address: "123 Avenue des Coiffeurs",
      city: "Paris",
      postalCode: "75010",
      country: "France",
      phone: "+33 1 42 00 00 00",
      email: "contact@berber-salon.fr"
    }
  };
  
  // License de test pour le client "Berber"
  const license = {
    licenseKey: "POS-BERBER-2024",
    clientName: "Salon de Coiffure Berber",
    licenseType: "STANDARD",
    isActive: true,
    expirationDate: "2025-12-31T23:59:59.999Z",
    modules: [
      { name: "pos-core", isEnabled: true },
      { name: "inventory", isEnabled: true },
      { name: "reports", isEnabled: true },
      { name: "accounting", isEnabled: false },
      { name: "crm", isEnabled: true }
    ],
    features: {
      maxUsers: 5,
      maxProducts: 1000,
      cloudSync: false,
      customBranding: true
    }
  };
  
  const outputPath = path.join(__dirname, '../generated-pos/berber-salon-test');
  
  try {
    console.log('🧪 Testing POS generation for Berber Salon...');
    await builder.generatePOS(config, license, outputPath);
    console.log('✅ Test completed successfully!');
    console.log(`📁 Generated POS saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Exporter la classe POSBuilder pour qu'elle puisse être importée
module.exports = { POSBuilder };

// Si ce fichier est exécuté directement, lancer le test
if (require.main === module) {
  testPOSGeneration();
}
