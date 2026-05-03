const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { directPOSConverter } = require('../utils/direct-pos-converter');

const prisma = new PrismaClient();

// Route pour la conversion directe du preview vers POS Electron
router.post('/direct-convert', async (req, res) => {
  try {
    const { licenseId, themeConfig } = req.body;

    if (!licenseId || !themeConfig) {
      return res.status(400).json({
        error: 'Missing required parameters: licenseId and themeConfig'
      });
    }

    // Récupérer la licence depuis la base de données
    const license = await prisma.license.findUnique({
      where: { id: String(licenseId) },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        }
      }
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Enrichir la licence avec la configuration de thème
    const enrichedLicense = {
      ...license,
      configuration: themeConfig
    };

    // Convertir directement
    const result = await directPOSConverter(enrichedLicense);

    res.json({
      success: true,
      message: 'POS conversion completed successfully',
      data: result
    });

  } catch (error) {
    console.error('❌ Direct conversion error:', error);
    res.status(500).json({
      error: 'Internal server error during conversion',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Route pour tester la conversion rapide (sans génération complète)
router.post('/quick-test', async (req, res) => {
  try {
    const { themeConfig } = req.body;

    if (!themeConfig) {
      return res.status(400).json({
        error: 'Missing required parameter: themeConfig'
      });
    }

    // Simuler un test rapide de la configuration
    res.json({
      success: true,
      message: 'Quick test completed successfully',
      preview: {
        themeApplied: true,
        colors: themeConfig.colors,
        layout: themeConfig.layout,
        effects: themeConfig.effects
      }
    });

  } catch (error) {
    console.error('❌ Quick test error:', error);
    res.status(500).json({
      error: 'Internal server error during quick test',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
