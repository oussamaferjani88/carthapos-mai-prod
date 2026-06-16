/**
 * BI Export IPC Handler
 * Generates standardized CSV exports + ZIP package for BI/ETL ingestion.
 * IPC-only architecture — no direct renderer DB access.
 *
 * Uses BI Data Contract Layer:
 *   - BiSchemaContract  → canonical schema definitions + versioning
 *   - BiDataMapper      → raw DB → normalized BI objects
 *   - BiValidator       → pre-export validation
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const BiSchemaContract = require('../bi/BiSchemaContract.cjs');
const BiDataMapper = require('../bi/BiDataMapper.cjs');
const BiValidator = require('../bi/BiValidator.cjs');

class IPCBiExportHandler {
  constructor(logger, dbManager) {
    this.logger = logger;
    this.dbManager = dbManager;
  }

  registerHandlers() {
    this.logger.info(' Registering BI export IPC handlers...');

    ipcMain.handle('bi:export', async (_event, options = {}) => {
      try {
        this.logger.info(' Starting BI export...');
        const result = await this.runExport(options);
        this.logger.info(' BI export completed:', result.filePath);
        return result;
      } catch (error) {
        this.logger.error(' BI export failed:', error);
        throw error;
      }
    });

    this.logger.info(' BI export IPC handlers registered');
  }

  async runExport(options = {}) {
    const appConfig = this._loadAppConfig();
    if (!appConfig) throw new Error('App configuration not loaded');

    const modules = appConfig.modules || [];
    const theme = appConfig.theme || {};
    const businessType = theme.sector || theme.businessType || 'retail';
    const clientId = this._getClientId(appConfig);

    const enabledModules = modules
      .filter(m => m.isEnabled !== false)
      .map(m => m.name || m);

    const db = this.dbManager.getDatabase();
    if (!db) throw new Error('Database not initialized');

    /* ---- 1. Collect & map data ---- */
    const datasets = {};

    datasets.sales      = await this._collectSales(db);
    datasets.products   = await this._collectProducts(db);
    datasets.customers  = await this._collectCustomers(db);
    datasets.inventory  = await this._collectInventory(db);

    if (enabledModules.some(m => m.includes('tables')))
      datasets.tables = await this._collectTables(db);
    if (enabledModules.some(m => m.includes('kitchen')))
      datasets.kitchen_orders = await this._collectKitchenOrders(db);
    if (enabledModules.some(m => m.includes('suppliers')))
      datasets.suppliers = await this._collectSuppliers(db);
    if (enabledModules.some(m => m.includes('services') || m.includes('appointments'))) {
      datasets.services = await this._collectServices(db);
      datasets.appointments = await this._collectAppointments(db);
    }

    /* ---- 2. Validate ---- */
    const validation = BiValidator.validateAll(datasets);
    if (validation.warnings.length > 0) {
      this.logger.warn(' BI export warnings:', validation.warnings.join('; '));
    }
    if (validation.errors.length > 0) {
      this.logger.error(' BI export validation errors:', validation.errors.join('; '));
      throw new Error('Validation des données BI échouée:\n' + validation.errors.join('\n'));
    }

    /* ---- 3. Generate CSV files ---- */
    const files = [];
    for (const [key, rows] of Object.entries(datasets)) {
      files.push({
        name: `${key}.csv`,
        data: this._biRowsToCsv(key, rows),
      });
    }

    /* ---- 4. Build metadata (with bi_schema_version) ---- */
    const metadata = {
      client_id: clientId,
      business_type: businessType,
      business_name: theme.businessName || '',
      enabled_modules: enabledModules,
      pos_version: '1.0.0',
      bi_schema_version: BiSchemaContract.BI_SCHEMA_VERSION,
      export_timestamp: new Date().toISOString(),
      total_files: files.length,
      file_list: files.map(f => f.name)
    };
    files.push({ name: 'metadata.json', data: JSON.stringify(metadata, null, 2) });

    /* ---- 5. Write ZIP ---- */
    const outputDir = this._getOutputDir();
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, `bi_export_${Date.now()}.zip`);
    await this._createZip(files, outputPath);

    const stats = files
      .filter(f => f.name !== 'metadata.json')
      .reduce((acc, f) => {
        const lines = f.data.split('\n').length - 1;
        acc.total_rows += lines;
        acc.files.push({ name: f.name, rows: lines });
        return acc;
      }, { total_rows: 0, files: [] });

    return {
      success: true,
      filePath: outputPath,
      fileName: path.basename(outputPath),
      fileSize: fs.statSync(outputPath).size,
      metadata,
      stats
    };
  }

  _getClientId(config) {
    if (config.clientId) return config.clientId;
    if (config.license && config.license.clientId) return config.license.clientId;
    return 'unknown-client';
  }

  _loadAppConfig() {
    try {
      const { app } = require('electron');
      const isDev = !app.isPackaged;
      const appConfigPath = isDev
        ? path.join(app.getAppPath(), 'public', 'app-config.json')
        : path.join(app.getAppPath(), 'dist', 'app-config.json');
      if (fs.existsSync(appConfigPath)) {
        return JSON.parse(fs.readFileSync(appConfigPath, 'utf8'));
      }
    } catch (e) {
      this.logger.warn('Could not load app-config.json for BI export:', e.message);
    }
    return null;
  }

  _getOutputDir() {
    try {
      const { app } = require('electron');
      const dir = path.join(app.getPath('documents'), 'CarthaPOS', 'BI_Exports');
      return dir;
    } catch (e) {
      return path.join(process.cwd(), 'bi_exports');
    }
  }

  _escapeCsv(val) {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  /**
   * Convert normalized BI rows to CSV using the schema contract column order.
   */
  _biRowsToCsv(datasetKey, rows) {
    const columns = BiSchemaContract.getColumnNames(datasetKey);
    if (columns.length === 0) return '';

    const header = columns.join(',');
    const lines = rows.map(row => {
      return columns.map(col => this._escapeCsv(row[col])).join(',');
    });
    return [header, ...lines].join('\n') + '\n';
  }

  _queryAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  /* ---- Data collection + mapping ---- */

  async _collectSales(db) {
    const rows = await this._queryAll(db, `
      SELECT s.id, s.total, s.tax, s.discount, s.payment_method,
             s.customer_id, s.table_id, s.created_at,
             c.name AS customer_name, c.email AS customer_email
      FROM sales s
      LEFT JOIN customers c ON s.customer_id = c.id
      ORDER BY s.created_at DESC
    `);
    return BiDataMapper.mapSalesRows(rows);
  }

  async _collectProducts(db) {
    const rows = await this._queryAll(db, `
      SELECT id, name, price, category, family, barcode, stock,
             description, image, created_at, updated_at
      FROM products ORDER BY name ASC
    `);
    return BiDataMapper.mapProductRows(rows);
  }

  async _collectCustomers(db) {
    const rows = await this._queryAll(db, `
      SELECT id, name, email, phone, address, created_at
      FROM customers ORDER BY name ASC
    `);
    return BiDataMapper.mapCustomerRows(rows);
  }

  async _collectInventory(db) {
    const rows = await this._queryAll(db, `
      SELECT p.id AS product_id, p.name AS product_name, p.stock,
             p.category, p.family, p.price,
             COALESCE((SELECT COUNT(*) FROM sale_items si JOIN sales s ON si.sale_id = s.id WHERE si.product_id = p.id), 0) AS times_sold
      FROM products p
      ORDER BY p.name ASC
    `);
    return BiDataMapper.mapInventoryRows(rows);
  }

  async _collectTables(db) {
    const rows = await this._queryAll(db, `
      SELECT id, table_number, capacity, status, created_at
      FROM restaurant_tables ORDER BY table_number ASC
    `);
    return BiDataMapper.mapTableRows(rows);
  }

  async _collectKitchenOrders(db) {
    const rows = await this._queryAll(db, `
      SELECT id, table_number, items, notes, priority, status, created_at, updated_at
      FROM kitchen_orders ORDER BY created_at DESC
    `);
    return BiDataMapper.mapKitchenOrderRows(rows);
  }

  async _collectSuppliers(db) {
    const rows = await this._queryAll(db, `
      SELECT id, name, contact, phone, email, address, created_at
      FROM suppliers ORDER BY name ASC
    `);
    return BiDataMapper.mapSupplierRows(rows);
  }

  async _collectServices(db) {
    const rows = await this._queryAll(db, `
      SELECT id, name, description, price, duration, created_at
      FROM services ORDER BY name ASC
    `);
    return BiDataMapper.mapServiceRows(rows);
  }

  async _collectAppointments(db) {
    const rows = await this._queryAll(db, `
      SELECT id, customer_name, customer_phone, service_id,
             appointment_date, notes, status, created_at
      FROM appointments ORDER BY appointment_date DESC
    `);
    return BiDataMapper.mapAppointmentRows(rows);
  }

  /**
   * Create a ZIP file using only Node.js built-in modules (zlib + fs).
   * The ZIP format is: [Local File Header + File Data]* + [Central Directory] + [End of Central Directory]
   */
  async _createZip(files, outputPath) {
    const LOCAL_FILE_HEADER_SIZE = 30;
    const CENTRAL_DIR_ENTRY_SIZE = 46;
    const EOCD_SIZE = 22;

    const entries = [];
    let localHeadersOffset = 0;
    const centralDirEntries = [];
    const fileDataBuffers = [];

    for (const file of files) {
      const fileName = file.name;
      const fileNameBuf = Buffer.from(fileName, 'utf8');
      const fileData = Buffer.from(file.data, 'utf8');

      const compressed = zlib.deflateRawSync(fileData);
      const useCompressed = compressed.length < fileData.length;
      const compressionMethod = useCompressed ? 8 : 0;
      const dataToStore = useCompressed ? compressed : fileData;

      const crc32 = this._crc32(fileData);

      const localHeader = Buffer.alloc(LOCAL_FILE_HEADER_SIZE);
      localHeader.writeUInt32LE(0x04034b50, 0);
      localHeader.writeUInt16LE(20, 4);
      localHeader.writeUInt16LE(0, 6);
      localHeader.writeUInt16LE(compressionMethod, 8);
      localHeader.writeUInt16LE(0, 10);
      localHeader.writeUInt16LE(0, 12);
      localHeader.writeUInt32LE(crc32, 14);
      localHeader.writeUInt32LE(dataToStore.length, 18);
      localHeader.writeUInt32LE(fileData.length, 22);
      localHeader.writeUInt16LE(fileNameBuf.length, 26);
      localHeader.writeUInt16LE(0, 28);

      fileDataBuffers.push(localHeader, fileNameBuf, dataToStore);

      const centralDirEntry = Buffer.alloc(CENTRAL_DIR_ENTRY_SIZE);
      centralDirEntry.writeUInt32LE(0x02014b50, 0);
      centralDirEntry.writeUInt16LE(20, 4);
      centralDirEntry.writeUInt16LE(20, 6);
      centralDirEntry.writeUInt16LE(0, 8);
      centralDirEntry.writeUInt16LE(compressionMethod, 10);
      centralDirEntry.writeUInt16LE(0, 12);
      centralDirEntry.writeUInt16LE(0, 14);
      centralDirEntry.writeUInt32LE(crc32, 16);
      centralDirEntry.writeUInt32LE(dataToStore.length, 20);
      centralDirEntry.writeUInt32LE(fileData.length, 24);
      centralDirEntry.writeUInt16LE(fileNameBuf.length, 28);
      centralDirEntry.writeUInt16LE(0, 30);
      centralDirEntry.writeUInt16LE(0, 32);
      centralDirEntry.writeUInt16LE(0, 34);
      centralDirEntry.writeUInt16LE(0, 36);
      centralDirEntry.writeUInt32LE(0, 38);
      centralDirEntry.writeUInt32LE(localHeadersOffset, 42);

      centralDirEntries.push({ buf: centralDirEntry, name: fileNameBuf });
      localHeadersOffset += LOCAL_FILE_HEADER_SIZE + fileNameBuf.length + dataToStore.length;
    }

    const centralDirStart = Buffer.concat(fileDataBuffers).length;
    const centralDirData = Buffer.concat(
      centralDirEntries.map(e => Buffer.concat([e.buf, e.name]))
    );
    const centralDirSize = centralDirData.length;

    const eocd = Buffer.alloc(EOCD_SIZE);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(centralDirEntries.length, 8);
    eocd.writeUInt16LE(centralDirEntries.length, 10);
    eocd.writeUInt32LE(centralDirSize, 12);
    eocd.writeUInt32LE(centralDirStart, 16);
    eocd.writeUInt16LE(0, 20);

    const fullZip = Buffer.concat([
      Buffer.concat(fileDataBuffers),
      centralDirData,
      eocd
    ]);

    fs.writeFileSync(outputPath, fullZip);
  }

  _crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) {
        if (crc & 1) {
          crc = (crc >>> 1) ^ 0xEDB88320;
        } else {
          crc = crc >>> 1;
        }
      }
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
}

function registerBiExportHandlers(databaseManager) {
  const { LoggerService } = require('../services/LoggerService.cjs');
  const logger = new LoggerService();

  const handler = new IPCBiExportHandler(logger, databaseManager);
  handler.registerHandlers();
}

module.exports = { IPCBiExportHandler, registerBiExportHandlers };
