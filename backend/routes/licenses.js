const express = require('express');
const { PrismaClient } = require('@prisma/client');
const fs = require('fs/promises');
const path = require('path');
const { generateLicenseKey, createLicenseFile } = require('../utils/license');
const router = express.Router();
const prisma = new PrismaClient();

const dataDir = path.resolve(__dirname, '../data');
const moduleUpgradeTransactionsPath = path.join(dataDir, 'module-upgrade-transactions.json');

const MODULE_PRICE_BY_CATEGORY = {
  core: 0,
  inventory: 39,
  restaurant: 49,
  service: 29,
  customer: 35,
  payment: 45,
  specialized: 59,
  administration: 25,
};

function getModuleUnitPrice(module) {
  if (!module || module.isCore) return 0;
  return MODULE_PRICE_BY_CATEGORY[module.category] ?? 35;
}

async function ensureModuleUpgradeTransactionsStore() {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(moduleUpgradeTransactionsPath);
  } catch {
    await fs.writeFile(moduleUpgradeTransactionsPath, '[]', 'utf8');
  }
}

async function readModuleUpgradeTransactions() {
  await ensureModuleUpgradeTransactionsStore();
  const raw = await fs.readFile(moduleUpgradeTransactionsPath, 'utf8');
  const parsed = JSON.parse(raw || '[]');
  return Array.isArray(parsed) ? parsed : [];
}

async function writeModuleUpgradeTransactions(transactions) {
  await ensureModuleUpgradeTransactionsStore();
  await fs.writeFile(moduleUpgradeTransactionsPath, JSON.stringify(transactions, null, 2), 'utf8');
}

// GET /api/licenses - Récupérer toutes les licences
router.get('/', async (req, res) => {
  try {
    const userId = req.query.userId || req.headers['x-user-id'];
    const userEmail = req.query.userEmail || req.headers['x-user-email'];

    const where = {};

    // User mode filtering for client portal history
    if (userId || userEmail) {
      const idFilter = userId
        ? {
            OR: [
              { clientId: String(userId) },
              { clientId: { startsWith: `${String(userId)}-` } }
            ]
          }
        : null;

      const emailFilter = userEmail
        ? {
            client: {
              email: String(userEmail)
            }
          }
        : null;

      // If both are provided, require both to reduce accidental data exposure.
      if (idFilter && emailFilter) {
        where.AND = [idFilter, emailFilter];
      } else if (idFilter) {
        Object.assign(where, idFilter);
      } else if (emailFilter) {
        Object.assign(where, emailFilter);
      }
    }

    const licenses = await prisma.license.findMany({
      where,
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    console.log('[POS DEBUG] [Backend] All licenses:', JSON.stringify(licenses, null, 2));
    res.json(licenses);
  } catch (error) {
    console.error('Error fetching licenses:', error);
    res.status(500).json({ error: 'Failed to fetch licenses' });
  }
});

// GET /api/licenses/:id - Récupérer une licence par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });
    console.log('[POS DEBUG] [Backend] License by ID:', id, JSON.stringify(license, null, 2));
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }
    res.json(license);
  } catch (error) {
    console.error('Error fetching license:', error);
    res.status(500).json({ error: 'Failed to fetch license' });
  }
});

// POST /api/licenses - // Fonction pour filtrer les champs de configuration valides
function filterValidConfigurationFields(configuration) {
  // Liste exhaustive des champs valides selon le schéma Prisma
  const validFields = [
    'licenseId',
    'businessName',
    'appTitle',
    'logo',
    'primaryColor',
    'secondaryColor',
    'accentColor',
    'backgroundColor',
    'textColor',
    'fontFamily',
    'borderRadius',
    'currency',
    'taxRate',
    'language',
    'timezone',
    'navbarPosition',
    'cardBackgroundColor',
    'borderColor',
    'textMutedColor',
    'fontSize',
    'fontWeight',
    'spacingScale',
    'maxWidth',
    'compactMode',
    'navbarCollapsible',
    'theme',
    'shadowIntensity',
    'opacity',
    'backdropBlur',
    'animations',
    'shadows',
    'hoverEffects',
    'glassEffect',
    'gradientBackgrounds',
    'autoModeSwitch',
    'autoSave',
    'customCSS',
    'buttonStyle',
    'cardStyle',
    'tableStyle',
    'modalStyle',
    'responsiveMode',
    'largeTextMode',
    'highContrastMode',
    'reducedMotion',
    'dashboardLayout',
    'widgetSizes',
    'showQuickActions',
    'showBreadcrumbs',
    'navbarStyle',
    'showModuleIcons',
    'showModuleBadges',
    'favicon',
    'brandWatermark',
    'splashScreen'
  ];

  // Mappage des valeurs string vers les valeurs correctes
  const stringToNumberMappings = {
    shadowIntensity: value => {
      // If it's already a number, return it
      if (typeof value === 'number') return value;
      
      // If it's a string, try to parse it or map it
      if (typeof value === 'string') {
        const mappings = {
          'none': 0.0,
          'light': 0.5,
          'medium': 1.0,
          'large': 2.0,
          'strong': 2.0,
          'extra': 3.0
        };
        
        // Check if it's a named value
        if (mappings[value.toLowerCase()] !== undefined) {
          return mappings[value.toLowerCase()];
        }
        
        // Try to parse as float
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 1.0 : numValue;
      }
      
      return 1.0; // default
    },
    spacingScale: value => {
      if (typeof value === 'number') return value;
      
      if (typeof value === 'string') {
        const mappings = {
          'compact': 0.8,
          'normal': 1.0,
          'comfortable': 1.2,
          'spacious': 1.5
        };
        
        if (mappings[value.toLowerCase()] !== undefined) {
          return mappings[value.toLowerCase()];
        }
        
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 1.0 : numValue;
      }
      
      return 1.0;
    },
    opacity: value => {
      if (typeof value === 'number') return value;
      
      if (typeof value === 'string') {
        const mappings = {
          'light': 0.7,
          'medium': 0.85,
          'normal': 1.0
        };
        
        if (mappings[value.toLowerCase()] !== undefined) {
          return mappings[value.toLowerCase()];
        }
        
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 1.0 : numValue;
      }
      
      return 1.0;
    },
    taxRate: value => {
      if (typeof value === 'string') {
        const numValue = parseFloat(value);
        return isNaN(numValue) ? 20.0 : numValue;
      }
      return typeof value === 'number' ? value : 20.0;
    }
  };

  // Fields that should remain as strings (Prisma String type)
  const ensureStringFields = {
    borderRadius: value => {
      // If it's already a string, return as-is
      if (typeof value === 'string') return value;
      // If it's a number, convert to string
      if (typeof value === 'number') return value.toString();
      // Default fallback
      return 'medium';
    },
    fontSize: value => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return `${value}px`;
      return '14px';
    },
    fontWeight: value => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return value.toString();
      return 'normal';
    },
    maxWidth: value => {
      if (typeof value === 'string') return value;
      if (typeof value === 'number') return `${value}px`;
      return '1200px';
    },
    hoverEffects: value => {
      if (typeof value === 'string') return value;
      return 'subtle';
    },
    buttonStyle: value => {
      if (typeof value === 'string') return value;
      return 'filled';
    },
    cardStyle: value => {
      if (typeof value === 'string') return value;
      return 'modern';
    },
    tableStyle: value => {
      if (typeof value === 'string') return value;
      return 'modern';
    },
    modalStyle: value => {
      if (typeof value === 'string') return value;
      return 'centered';
    },
    responsiveMode: value => {
      if (typeof value === 'string') return value;
      return 'auto';
    },
    dashboardLayout: value => {
      if (typeof value === 'string') return value;
      return 'grid';
    },
    widgetSizes: value => {
      if (typeof value === 'string') return value;
      return 'mixed';
    },
    navbarStyle: value => {
      if (typeof value === 'string') return value;
      return 'modern';
    },
    theme: value => {
      if (typeof value === 'string') return value;
      return 'light';
    },
    animationType: value => {
      if (typeof value === 'string') return value;
      return 'slide';
    },
    cardAnimationType: value => {
      if (typeof value === 'string') return value;
      return 'slide';
    },
    animationSpeed: value => {
      if (typeof value === 'string') return value;
      return 'normal';
    },
    cardAnimationSpeed: value => {
      if (typeof value === 'string') return value;
      return 'normal';
    },
    navbarPosition: value => {
      if (typeof value === 'string') return value;
      return 'left';
    },
    navbarWidth: value => {
      if (typeof value === 'string') return value;
      return '64px';
    },
    navbarHeight: value => {
      if (typeof value === 'string') return value;
      return '48px';
    },
    receiptHeader: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    receiptFooter: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    businessAddress: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    businessPhone: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    businessEmail: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    businessWebsite: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    businessTaxId: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    welcomeText: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    footerText: value => {
      if (typeof value === 'string') return value;
      return '';
    },
    receiptQRContent: value => {
      if (typeof value === 'string') return value;
      return 'website';
    }
  };

  const stringToBooleanMappings = {
    compactMode: value => value === true || value === 'true',
    navbarCollapsible: value => value === true || value === 'true',
    backdropBlur: value => value === true || value === 'true',
    animations: value => value === true || value === 'true',
    cardAnimations: value => value === true || value === 'true',
    shadows: value => value === true || value === 'true',
    glassEffect: value => value === true || value === 'true',
    gradientBackgrounds: value => value === true || value === 'true',
    autoModeSwitch: value => value === true || value === 'true',
    autoSave: value => value === true || value === 'true',
    largeTextMode: value => value === true || value === 'true',
    highContrastMode: value => value === true || value === 'true',
    reducedMotion: value => value === true || value === 'true',
    showQuickActions: value => value === true || value === 'true',
    showBreadcrumbs: value => value === true || value === 'true',
    showModuleIcons: value => value === true || value === 'true',
    showModuleBadges: value => value === true || value === 'true',
    brandWatermark: value => value === true || value === 'true',
    splashScreen: value => value === true || value === 'true',
    sidebarCollapsible: value => value !== false && value !== 'false',
    receiptShowLogo: value => value !== false && value !== 'false',
    receiptShowBusinessInfo: value => value !== false && value !== 'false',
    receiptShowQR: value => value === true || value === 'true',
    printReceiptAuto: value => value === true || value === 'true',
    enableNotifications: value => value !== false && value !== 'false',
    enableCaching: value => value !== false && value !== 'false',
    lazyLoading: value => value !== false && value !== 'false',
    keyboardNavigation: value => value !== false && value !== 'false'
  };

  const filtered = {};
  validFields.forEach(field => {
    if (configuration.hasOwnProperty(field)) {
      let value = configuration[field];
      
      // Convertir les valeurs de type string vers number si nécessaire
      if (stringToNumberMappings[field]) {
        value = stringToNumberMappings[field](value);
      }
      
      // Ensure certain fields remain as strings
      if (ensureStringFields[field]) {
        value = ensureStringFields[field](value);
      }
      
      // Convertir les valeurs boolean si nécessaire
      if (stringToBooleanMappings[field]) {
        value = stringToBooleanMappings[field](value);
      }
      
      filtered[field] = value;
    }
  });

  return filtered;
}

// Créer une nouvelle licence
router.post('/', async (req, res) => {
  try {
    const {
      clientId,
      userId: bodyUserId,
      sector,
      licenseType,
      expirationDate,
      modules,
      configuration
    } = req.body;

    // Get userId from body, query params, or headers
    const userId = bodyUserId || req.query.userId || req.headers['x-user-id'];

    console.log('License creation request:', {
      clientId,
      userId,
      sector,
      licenseType,
      userName: req.body.userName,
      userEmail: req.body.userEmail,
      queryParams: req.query,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-access-mode': req.headers['x-access-mode']
      }
    });

    if ((!clientId && !userId) || !sector || !licenseType) {
      return res.status(400).json({ 
        error: 'ClientId or userId, sector, and licenseType are required' 
      });
    }

    let actualClientId = clientId;

    // En mode user : chercher ou créer un client associé à l'userId
    if (userId) {
      // Chercher un client existant avec cet userId ou email
      let client = await prisma.client.findFirst({
        where: { 
          OR: [
            { id: userId },
            { id: clientId },
            { email: req.body.userEmail || undefined }
          ].filter(Boolean)
        }
      });

      // Si le client existe déjà (par email ou userId), le réutiliser
      if (client) {
        console.log(`Using existing client: ${client.id} for user: ${userId}`);
        actualClientId = client.id;
      } else {
        // Créer un nouveau client avec un ID unique
        console.log(`Creating new client for userId: ${userId}`);
        
        // Générer un ID unique pour chaque nouveau client
        const uniqueClientId = `${userId}-${Date.now()}`;
        const uniqueEmail = req.body.userEmail || `${uniqueClientId}@user.local`;
        
        const clientData = {
          id: uniqueClientId,
          name: req.body.userName || req.body.userEmail || `Client-${Date.now()}`,
          email: uniqueEmail,
          phone: req.body.phone || '',
          address: req.body.address || ''
        };

        client = await prisma.client.create({
          data: clientData
        });
        console.log(`Client created: ${client.id}`);
        actualClientId = client.id;
      }
    } else if (clientId) {
      // Mode admin uniquement : vérifier que le client existe
      const client = await prisma.client.findUnique({
        where: { id: clientId }
      });

      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }
      actualClientId = clientId;
    }

    // Générer une clé de licence unique
    const licenseKey = generateLicenseKey();

    // Créer la licence avec actualClientId
    const license = await prisma.license.create({
      data: {
        clientId: actualClientId,
        licenseKey,
        sector,
        licenseType,
        expirationDate: licenseType === 'LIFETIME' ? null : new Date(expirationDate),
        isActive: true
      }
    });

    // Ajouter les modules à la licence
    if (modules && modules.length > 0) {
      // Résoudre les identifiants: chaque module peut être référencé par son
      // ID Prisma (CUID) ou par son name unique.
      const uniqueIdentifiers = [...new Set(modules)];

      // 1. Chercher par ID d'abord
      const byId = await prisma.module.findMany({
        where: { id: { in: uniqueIdentifiers } }
      });
      const foundIds = new Set(byId.map(m => m.id));

      // 2. Ce qui reste : chercher par name
      const remainingNames = uniqueIdentifiers.filter(id => !foundIds.has(id));
      let byName = [];
      if (remainingNames.length > 0) {
        byName = await prisma.module.findMany({
          where: { name: { in: remainingNames } }
        });
      }

      const foundModules = [...byId, ...byName];
      const resolvedIdentifiers = new Set([
        ...foundModules.map(m => m.id),
        ...foundModules.map(m => m.name)
      ]);

      // Vérifier que chaque identifiant unique correspond à un module existant
      const allResolved = uniqueIdentifiers.every(id => resolvedIdentifiers.has(id));
      if (!allResolved) {
        return res.status(400).json({ error: 'Un ou plusieurs modules sont invalides.' });
      }

      // Utiliser l'ID Prisma réel pour la relation (évite les doublons)
      const usedIds = new Set();
      const licenseModules = foundModules
        .filter(m => {
          if (usedIds.has(m.id)) return false;
          usedIds.add(m.id);
          return true;
        })
        .map(m => ({
          licenseId: license.id,
          moduleId: m.id,
          isEnabled: true
        }));

      await prisma.licenseModule.createMany({
        data: licenseModules
      });
    }

    // Ajouter la configuration
    if (configuration && Object.keys(configuration).length > 0) {
      // Filtrer uniquement les champs valides du schéma Prisma
      const filteredConfig = filterValidConfigurationFields({
        licenseId: license.id,
        businessName: configuration.businessName || req.body.userName || 'Mon Entreprise',
        ...configuration
      });

      await prisma.licenseConfiguration.create({
        data: filteredConfig
      });
    }

    // Récupérer la licence complète
    const completeLicense = await prisma.license.findUnique({
      where: { id: license.id },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });

    res.status(201).json(completeLicense);
  } catch (error) {
    console.error('Error creating license:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// POST /api/licenses/admin-create - Créer une licence (admin, sans paiement)
router.post('/admin-create', async (req, res) => {
  try {
    const {
      clientId,
      sector,
      licenseType,
      bindingType,
      expirationDate,
      machineId,
      moduleIds,
      configuration
    } = req.body;

    console.log('[admin-create] Creating license:', { clientId, sector, licenseType, bindingType });

    if (!clientId || !sector || !licenseType) {
      return res.status(400).json({ error: 'clientId, sector, and licenseType are required' });
    }

    // Vérifier que le client existe
    const client = await prisma.client.findUnique({
      where: { id: clientId }
    });

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Générer une clé de licence unique
    const licenseKey = generateLicenseKey();

    // Créer la licence (aucune vérification de paiement)
    const license = await prisma.license.create({
      data: {
        clientId,
        licenseKey,
        sector,
        licenseType,
        bindingType: bindingType || 'MACHINE',
        expirationDate: licenseType === 'LIFETIME' ? null : new Date(expirationDate),
        isActive: true,
        machineId: machineId || null,
        createdBy: 'admin'
      }
    });

    // Ajouter les modules
    if (moduleIds && moduleIds.length > 0) {
      const uniqueIdentifiers = [...new Set(moduleIds)];
      const byId = await prisma.module.findMany({
        where: { id: { in: uniqueIdentifiers } }
      });
      const foundIds = new Set(byId.map(m => m.id));
      const remainingNames = uniqueIdentifiers.filter(id => !foundIds.has(id));
      let byName = [];
      if (remainingNames.length > 0) {
        byName = await prisma.module.findMany({
          where: { name: { in: remainingNames } }
        });
      }
      const foundModules = [...byId, ...byName];
      const resolved = new Set([
        ...foundModules.map(m => m.id),
        ...foundModules.map(m => m.name)
      ]);
      const allResolved = uniqueIdentifiers.every(id => resolved.has(id));
      if (!allResolved) {
        return res.status(400).json({ error: 'Un ou plusieurs modules sont invalides.' });
      }
      const usedIds = new Set();
      const licenseModuleData = foundModules
        .filter(m => {
          if (usedIds.has(m.id)) return false;
          usedIds.add(m.id);
          return true;
        })
        .map(m => ({
          licenseId: license.id,
          moduleId: m.id,
          isEnabled: true
        }));
      await prisma.licenseModule.createMany({ data: licenseModuleData });
    }

    // Ajouter la configuration
    if (configuration && Object.keys(configuration).length > 0) {
      const filteredConfig = filterValidConfigurationFields({
        licenseId: license.id,
        businessName: configuration.businessName || client.name,
        ...configuration
      });
      await prisma.licenseConfiguration.create({
        data: filteredConfig
      });
    }

    // Récupérer la licence complète
    const completeLicense = await prisma.license.findUnique({
      where: { id: license.id },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });

    res.status(201).json(completeLicense);
  } catch (error) {
    console.error('[admin-create] Error:', error);
    res.status(500).json({ error: 'Failed to create license' });
  }
});

// PUT /api/licenses/:id - Mettre à jour une licence
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      sector,
      licenseType,
      expirationDate,
      isActive,
      modules,
      configuration
    } = req.body;

    const existingLicense = await prisma.license.findUnique({
      where: { id }
    });

    if (!existingLicense) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Mettre à jour la licence
    const updatedLicense = await prisma.license.update({
      where: { id },
      data: {
        sector: sector || existingLicense.sector,
        licenseType: licenseType || existingLicense.licenseType,
        expirationDate: licenseType === 'LIFETIME' ? null : 
          (expirationDate ? new Date(expirationDate) : existingLicense.expirationDate),
        isActive: isActive !== undefined ? isActive : existingLicense.isActive
      }
    });

    // Mettre à jour les modules si fournis
    if (modules) {
      // Supprimer les anciens modules
      await prisma.licenseModule.deleteMany({
        where: { licenseId: id }
      });

      // Ajouter les nouveaux modules
      if (modules.length > 0) {
        const licenseModules = modules.map(moduleId => ({
          licenseId: id,
          moduleId,
          isEnabled: true
        }));

        await prisma.licenseModule.createMany({
          data: licenseModules
        });
      }
    }

    // Mettre à jour la configuration si fournie
    if (configuration) {
      await prisma.licenseConfiguration.upsert({
        where: { licenseId: id },
        update: configuration,
        create: {
          licenseId: id,
          ...configuration
        }
      });
    }

    // Récupérer la licence mise à jour
    const completeLicense = await prisma.license.findUnique({
      where: { id },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });

    res.json(completeLicense);
  } catch (error) {
    console.error('Error updating license:', error);
    res.status(500).json({ error: 'Failed to update license' });
  }
});

// DELETE /api/licenses/:id - Supprimer une licence
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const existingLicense = await prisma.license.findUnique({
      where: { id }
    });

    if (!existingLicense) {
      return res.status(404).json({ error: 'License not found' });
    }

    await prisma.license.delete({
      where: { id }
    });

    res.json({ message: 'License deleted successfully' });
  } catch (error) {
    console.error('Error deleting license:', error);
    res.status(500).json({ error: 'Failed to delete license' });
  }
});

// POST /api/licenses/:id/generate-file - Générer le fichier de licence
router.post('/:id/generate-file', async (req, res) => {
  try {
    const { id } = req.params;
    const { machineId } = req.body;

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    // Mettre à jour le machineId si fourni
    if (machineId) {
      await prisma.license.update({
        where: { id },
        data: { machineId }
      });
    }

    // Générer le fichier de licence chiffré
    const licenseFileContent = await createLicenseFile(license);

    res.json({
      message: 'License file generated successfully',
      licenseKey: license.licenseKey,
      content: licenseFileContent
    });
  } catch (error) {
    console.error('Error generating license file:', error);
    res.status(500).json({ error: 'Failed to generate license file' });
  }
});

// POST /api/licenses/:id/module-upgrade-quote - Calculate module upgrade due amount
router.post('/:id/module-upgrade-quote', async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleIds = [] } = req.body;

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ error: 'moduleIds must be an array' });
    }

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        modules: {
          include: {
            module: true,
          },
        },
      },
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const existingModuleIds = new Set((license.modules || []).map((m) => m.moduleId));
    const requestedModules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
      orderBy: { displayName: 'asc' },
    });

    const newModules = requestedModules
      .filter((m) => !existingModuleIds.has(m.id))
      .map((m) => ({
        id: m.id,
        name: m.name,
        displayName: m.displayName,
        category: m.category,
        unitPrice: getModuleUnitPrice(m),
      }));

    const amountDue = newModules.reduce((sum, m) => sum + m.unitPrice, 0);

    res.json({
      licenseId: id,
      requestedCount: requestedModules.length,
      alreadyOwnedCount: requestedModules.length - newModules.length,
      newModules,
      amountDue,
      currency: 'TND',
    });
  } catch (error) {
    console.error('Error calculating module upgrade quote:', error);
    res.status(500).json({ error: 'Failed to calculate module upgrade quote' });
  }
});

// POST /api/licenses/:id/module-upgrade-purchase - Pay due and attach new modules
router.post('/:id/module-upgrade-purchase', async (req, res) => {
  try {
    const { id } = req.params;
    const { moduleIds = [], payment = {} } = req.body;
    const paidAmount = Number(payment.amount || 0);

    if (!Array.isArray(moduleIds)) {
      return res.status(400).json({ error: 'moduleIds must be an array' });
    }

    const license = await prisma.license.findUnique({
      where: { id },
      include: {
        modules: true,
      },
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    const existingModuleIds = new Set((license.modules || []).map((m) => m.moduleId));
    const requestedModules = await prisma.module.findMany({
      where: { id: { in: moduleIds } },
    });

    const newModules = requestedModules.filter((m) => !existingModuleIds.has(m.id));
    const amountDue = newModules.reduce((sum, m) => sum + getModuleUnitPrice(m), 0);

    if (paidAmount < amountDue) {
      return res.status(400).json({
        error: 'Insufficient payment amount',
        amountDue,
        paidAmount,
      });
    }

    if (newModules.length > 0) {
      await prisma.licenseModule.createMany({
        data: newModules.map((m) => ({
          licenseId: id,
          moduleId: m.id,
          isEnabled: true,
        })),
      });
    }

    const paymentRecord = {
      id: `mup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      licenseId: id,
      method: payment.method || 'manual',
      reference: payment.reference || null,
      amountDue,
      paidAmount,
      change: paidAmount - amountDue,
      modulesAdded: newModules.map((m) => ({
        id: m.id,
        displayName: m.displayName,
        category: m.category,
        unitPrice: getModuleUnitPrice(m),
      })),
      createdAt: new Date().toISOString(),
    };

    const transactions = await readModuleUpgradeTransactions();
    transactions.push(paymentRecord);
    await writeModuleUpgradeTransactions(transactions);

    const updatedLicense = await prisma.license.findUnique({
      where: { id },
      include: {
        client: true,
        modules: {
          include: {
            module: true,
          },
        },
        configuration: true,
      },
    });

    res.json({
      message: 'Module upgrade completed',
      license: updatedLicense,
      payment: paymentRecord,
      addedModules: newModules.map((m) => ({
        id: m.id,
        displayName: m.displayName,
      })),
    });
  } catch (error) {
    console.error('Error processing module upgrade purchase:', error);
    res.status(500).json({ error: 'Failed to process module upgrade purchase' });
  }
});

// GET /api/licenses/:id/module-upgrade-transactions - List upgrade payments for one license
router.get('/:id/module-upgrade-transactions', async (req, res) => {
  try {
    const { id } = req.params;
    const transactions = await readModuleUpgradeTransactions();
    const byLicense = transactions
      .filter((tx) => tx.licenseId === id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      licenseId: id,
      total: byLicense.length,
      transactions: byLicense,
    });
  } catch (error) {
    console.error('Error fetching module upgrade transactions:', error);
    res.status(500).json({ error: 'Failed to fetch module upgrade transactions' });
  }
});

module.exports = router;

