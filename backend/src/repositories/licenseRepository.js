const prisma = require('../config/database');
const BaseRepository = require('./BaseRepository');

class LicenseRepository extends BaseRepository {
  constructor() {
    super(prisma.license);
  }

  async findByKey(licenseKey) {
    return await this.model.findUnique({
      where: { licenseKey },
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
  }

  async findByClientId(clientId) {
    return await this.model.findMany({
      where: { clientId },
      include: {
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

  async findActiveLicenses() {
    return await this.model.findMany({
      where: { isActive: true },
      include: {
        client: true,
        configuration: true
      }
    });
  }

  async findExpiringSoon(days = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    return await this.model.findMany({
      where: {
        licenseType: 'SUBSCRIPTION',
        isActive: true,
        expirationDate: {
          lte: futureDate,
          gte: new Date()
        }
      },
      include: {
        client: true
      }
    });
  }

  async updateConfiguration(licenseId, configData) {
    const data = sanitizeConfiguration(configData || {});
    if (!data.businessName) data.businessName = 'Mon Entreprise';
    return await prisma.licenseConfiguration.upsert({
      where: { licenseId },
      update: data,
      create: {
        licenseId,
        ...data
      }
    });
  }

  // ── License V2 audit / history tables ─────────────────────────

  async createActivationHistory(data) {
    return await prisma.licenseActivationHistory.create({ data });
  }

  async createValidationLog(data) {
    return await prisma.licenseValidationLog.create({ data });
  }

  async createTransferHistory(data) {
    return await prisma.licenseTransferHistory.create({ data });
  }

  async getActivationHistories(licenseId, limit = 100) {
    return await prisma.licenseActivationHistory.findMany({
      where: { licenseId },
      orderBy: { performedAt: 'desc' },
      take: limit
    });
  }

  async getValidationLogs(licenseId, limit = 100) {
    return await prisma.licenseValidationLog.findMany({
      where: { licenseId },
      orderBy: { validatedAt: 'desc' },
      take: limit
    });
  }

  async getTransferHistories(licenseId, limit = 100) {
    return await prisma.licenseTransferHistory.findMany({
      where: { licenseId },
      orderBy: { authorizedAt: 'desc' },
      take: limit
    });
  }

  async getHistory(licenseId) {
    const [activationHistories, validationLogs, transferHistories] = await Promise.all([
      this.getActivationHistories(licenseId),
      this.getValidationLogs(licenseId),
      this.getTransferHistories(licenseId)
    ]);
    return { activationHistories, validationLogs, transferHistories };
  }
}

/**
 * Sanitize an arbitrary configuration object against the LicenseConfiguration
 * Prisma model: unknown keys are dropped from the flat record and the FULL
 * original object is preserved in `rawConfig` (Json). Values are coerced to
 * the column type so the upsert never fails on a UI payload.
 */
const CONFIG_MODEL_FIELDS = {
  businessName: 'string',
  logo: 'string',
  primaryColor: 'string',
  secondaryColor: 'string',
  accentColor: 'string',
  backgroundColor: 'string',
  textColor: 'string',
  currency: 'string',
  language: 'string',
  timezone: 'string',
  borderRadius: 'string',
  fontFamily: 'string',
  navbarPosition: 'string',
  buttonStyle: 'string',
  cardBackgroundColor: 'string',
  cardStyle: 'string',
  customCSS: 'string',
  dashboardLayout: 'string',
  favicon: 'string',
  fontSize: 'string',
  fontWeight: 'string',
  hoverEffects: 'string',
  modalStyle: 'string',
  navbarStyle: 'string',
  responsiveMode: 'string',
  tableStyle: 'string',
  textMutedColor: 'string',
  widgetSizes: 'string',
  appTitle: 'string',
  borderColor: 'string',
  maxWidth: 'string',
  theme: 'string',
  animations: 'boolean',
  brandWatermark: 'boolean',
  compactMode: 'boolean',
  glassEffect: 'boolean',
  gradientBackgrounds: 'boolean',
  highContrastMode: 'boolean',
  largeTextMode: 'boolean',
  navbarCollapsible: 'boolean',
  reducedMotion: 'boolean',
  showBreadcrumbs: 'boolean',
  showModuleBadges: 'boolean',
  showModuleIcons: 'boolean',
  showQuickActions: 'boolean',
  splashScreen: 'boolean',
  autoModeSwitch: 'boolean',
  autoSave: 'boolean',
  backdropBlur: 'boolean',
  shadows: 'boolean',
  taxRate: 'number',
  opacity: 'number',
  spacingScale: 'number',
  shadowIntensity: 'number',
  posConfigVersion: 'number'
};

function sanitizeConfiguration(configData) {
  const result = {};
  for (const [field, type] of Object.entries(CONFIG_MODEL_FIELDS)) {
    const value = configData[field];
    if (value === undefined || value === null || value === '') continue;
    if (type === 'string') result[field] = String(value);
    else if (type === 'boolean') result[field] = value === true || value === 'true';
    else if (type === 'number') {
      const num = Number(value);
      if (!Number.isNaN(num)) result[field] = num;
    }
  }
  result.rawConfig = JSON.parse(JSON.stringify(configData));
  return result;
}

module.exports = new LicenseRepository();
