/**
 * BI Export IPC Handler v2
 *
 * Enterprise-grade, registry-driven export engine.
 * Generates standardized CSV exports + ZIP package for BI/ETL ingestion.
 *
 * v2 — Full rewrite:
 *   - Registry-driven dataset resolution (no hardcoded if/else)
 *   - Business-type aware exports
 *   - Parallel query execution
 *   - Metadata v2 with complete export description
 *   - Export summary with validation report
 *   - Facts vs Dimensions classification
 *
 * Architecture:
 *   BiDatasetRegistry  -> determines WHICH datasets to export
 *   BiSchemaContract   -> defines column schemas for each dataset
 *   BiDataMapper       -> transforms DB rows to BI objects
 *   BiValidator        -> validates before export
 */

const { ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const zlib = require('zlib');

const BiSchemaContract = require('../bi/BiSchemaContract.cjs');
const BiDataMapper = require('../bi/BiDataMapper.cjs');
const BiValidator = require('../bi/BiValidator.cjs');
const BiDatasetRegistry = require('../bi/BiDatasetRegistry.cjs');

class IPCBiExportHandler {
  constructor(logger, dbManager) {
    this.logger = logger;
    this.dbManager = dbManager;
  }

  registerHandlers() {
    this.logger.info('Registering BI export IPC handlers (v2)...');

    ipcMain.handle('bi:export', async (_event, options = {}) => {
      try {
        this.logger.info('Starting BI export v2...');
        const result = await this.runExport(options);
        this.logger.info('BI export v2 completed:', result.filePath);
        return result;
      } catch (error) {
        this.logger.error('BI export v2 failed:', error);
        throw error;
      }
    });

    this.logger.info('BI export IPC handlers registered (v2)');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MAIN EXPORT ORCHESTRATOR
  // ═══════════════════════════════════════════════════════════════════════════

  async runExport(options = {}) {
    const startTime = Date.now();

    // 1. Load configuration
    const appConfig = this._loadAppConfig();
    if (!appConfig) throw new Error('App configuration not loaded');

    const theme = appConfig.theme || {};
    const businessType = options.businessType || theme.sector || theme.businessType || 'retail';
    const clientId = this._getClientId(appConfig);
    const currency = theme.currency || 'TND';
    const timezone = theme.timezone || 'Europe/Paris';
    const language = theme.language || 'fr';

    const enabledModules = (appConfig.modules || [])
      .filter(m => m.isEnabled !== false)
      .map(m => m.name || m);

    // 2. Resolve which datasets to export
    const datasetKeys = BiDatasetRegistry.resolveExportDatasets(businessType, enabledModules);
    this.logger.info(`Exporting ${datasetKeys.length} datasets for business type "${businessType}"`);

    // 3. Get database handle
    const db = this.dbManager.getDatabase();
    if (!db) throw new Error('Database not initialized');

    // 4. Collect data — parallelize independent queries
    const datasets = {};
    const collectionErrors = [];

    const PARALLEL_BATCHES = [
      ['sales', 'products', 'customers'],
      ['product_families'],
    ];

    for (const batch of PARALLEL_BATCHES) {
      const applicable = batch.filter(k => datasetKeys.includes(k));
      if (applicable.length === 0) continue;

      const results = await Promise.allSettled(
        applicable.map(key => this._collectDataset(db, key))
      );

      for (let i = 0; i < results.length; i++) {
        const key = applicable[i];
        if (results[i].status === 'fulfilled') {
          datasets[key] = results[i].value;
        } else {
          collectionErrors.push({ dataset: key, error: results[i].reason?.message });
          this.logger.error(`Failed to collect ${key}:`, results[i].reason?.message);
        }
      }
    }

    // Now run the rest sequentially (they may depend on products/customers)
    for (const key of datasetKeys) {
      if (datasets[key] !== undefined) continue;
      try {
        datasets[key] = await this._collectDataset(db, key);
      } catch (err) {
        collectionErrors.push({ dataset: key, error: err.message });
        this.logger.error(`Failed to collect ${key}:`, err.message);
      }
    }

    // 5. Validate
    const validation = BiValidator.validateAll(datasets, datasetKeys);
    if (validation.warnings.length > 0) {
      this.logger.warn('BI export warnings:', validation.warnings.join('; '));
    }
    if (validation.errors.length > 0) {
      this.logger.error('BI export validation errors:', validation.errors.join('; '));
      throw new Error('Validation des donnees BI echouee:\n' + validation.errors.join('\n'));
    }

    // 6. Generate CSV files
    const files = [];
    const rowCounts = {};
    for (const [key, rows] of Object.entries(datasets)) {
      const csv = this._biRowsToCsv(key, rows);
      files.push({ name: `${key}.csv`, data: csv });
      rowCounts[key] = rows.length;
    }

    // 7. Build metadata v2
    const totalRows = Object.values(rowCounts).reduce((sum, n) => sum + n, 0);
    const metadata = this._buildMetadataV2({
      clientId,
      businessType,
      businessName: theme.businessName || '',
      enabledModules,
      currency,
      timezone,
      language,
      files,
      rowCounts,
      totalRows,
      validation,
      collectionErrors,
      startTime,
    });

    files.push({ name: 'metadata.json', data: JSON.stringify(metadata, null, 2) });

    // 8. Write ZIP
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
      stats,
      validation: {
        warnings: validation.warnings,
        errors: validation.errors,
        classification: validation.classification,
        summary: validation.summary,
      },
      exportDuration: Date.now() - startTime,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // REGISTRY-DRIVEN DATA COLLECTION
  // ═══════════════════════════════════════════════════════════════════════════

  async _collectDataset(db, datasetKey) {
    const entry = BiDatasetRegistry.getRegistryEntry(datasetKey);
    if (!entry) throw new Error(`No registry entry for dataset "${datasetKey}"`);

    const rows = await this._queryAll(db, entry.sql);
    const mapperFn = BiDataMapper.getMapper(entry.mapper);
    if (!mapperFn) throw new Error(`No mapper "${entry.mapper}" for dataset "${datasetKey}"`);

    return mapperFn(rows);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // METADATA V2
  // ═══════════════════════════════════════════════════════════════════════════

  _buildMetadataV2({
    clientId, businessType, businessName, enabledModules,
    currency, timezone, language, files, rowCounts,
    totalRows, validation, collectionErrors, startTime,
  }) {
    const datasetSummaries = files
      .filter(f => f.name !== 'metadata.json')
      .map(f => {
        const key = f.name.replace('.csv', '');
        const entry = BiDatasetRegistry.getRegistryEntry(key);
        return {
          name: f.name,
          key,
          rows: rowCounts[key] || 0,
          category: entry?.category || 'unknown',
          description: entry?.description || '',
          module: entry?.module || null,
          required: entry?.required || false,
        };
      });

    const { facts, dimensions } = validation.classification || { facts: [], dimensions: [] };

    return {
      schema_version: BiSchemaContract.BI_SCHEMA_VERSION,
      export_version: BiSchemaContract.EXPORT_VERSION,
      generator_version: BiSchemaContract.GENERATOR_VERSION,

      client_id: clientId,
      business_type: businessType,
      business_name: businessName,
      enabled_modules: enabledModules,

      currency,
      timezone,
      language,

      export_timestamp: new Date().toISOString(),
      export_duration_ms: Date.now() - startTime,

      total_files: files.filter(f => f.name !== 'metadata.json').length,
      total_rows: totalRows,
      dataset_summaries: datasetSummaries,

      classification: {
        facts: facts,
        dimensions: dimensions,
      },

      validation: {
        warnings_count: validation.warnings.length,
        errors_count: validation.errors.length,
        warnings: validation.warnings,
        orphans_detected: validation.warnings.some(w => w.includes('orphelin')),
      },

      collection_errors: collectionErrors,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS (unchanged from v1)
  // ═══════════════════════════════════════════════════════════════════════════

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
      return path.join(app.getPath('documents'), 'CarthaPOS', 'BI_Exports');
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

  _biRowsToCsv(datasetKey, rows) {
    const columns = BiSchemaContract.getColumnNames(datasetKey);
    if (columns.length === 0) return '';

    const header = columns.join(',');
    const lines = rows.map(row => {
      return columns.map(col => this._escapeCsv(row[col])).join(',');
    });
    return '\uFEFF' + [header, ...lines].join('\n') + '\n';
  }

  _queryAll(db, sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ZIP CREATION (unchanged from v1 — proven, correct)
  // ═══════════════════════════════════════════════════════════════════════════

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
