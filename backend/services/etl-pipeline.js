const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const BiSchemaRegistry = require('./bi-schema-registry');
const dataPreparationService = require('./data-preparation-service');
const { parseInteger, parseNumber, parseDate } = require('./bi-data-utils');
const { DATASET_RULES } = require('./data-preparation-service');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const warehousePrisma = require('../prisma-warehouse/client');

const DEBUG = process.env.BI_DEBUG === 'true';

function log(...args) {
  console.log('[ETL]', ...args);
}

function debug(...args) {
  if (DEBUG) console.log('[ETL:DEBUG]', ...args);
}

class EtlPipeline {

  async run(uploadId, zipPath) {
    const startTime = Date.now();
    let tempDir = null;
    let step = 'init';

    log(`START uploadId=${uploadId} zipPath=${zipPath}`);

    try {
      /* ── STEP 1: Extract ZIP ──────────────────────────────── */
      step = 'extract';
      log(`STEP 1: Extract ZIP`);
      const t1 = Date.now();
      tempDir = this._extractZipSync(zipPath);
      log(`STEP 1 COMPLETE (${Date.now() - t1}ms)`);

      /* ── ZIP inspection ──────────────────────────────────── */
      this._inspectZip(tempDir);

      /* ── STEP 2: Read metadata ──────────────────────────────── */
      step = 'metadata';
      log(`STEP 2: Read metadata.json`);
      const t2 = Date.now();
      const metadata = this._readMetadata(tempDir);
      log(`STEP 2 COMPLETE (${Date.now() - t2}ms)`);
      log(`  clientId=${metadata.clientId}`);
      log(`  businessType=${metadata.businessType}`);
      log(`  schemaVersion=${metadata.biSchemaVersion}`);

      /* ── Override metadata.clientId with upload.clientId ───── */
      const upload = await prisma.biUpload.findUnique({
        where: { id: uploadId },
        select: { clientId: true },
      });
      if (upload && upload.clientId) {
        if (upload.clientId !== metadata.clientId) {
          log(`  Overriding clientId: metadata="${metadata.clientId}" → upload="${upload.clientId}"`);
          metadata.clientId = upload.clientId;
        }
      } else {
        log(`  WARN: Upload ${uploadId} has no clientId, keeping metadata.clientId="${metadata.clientId}"`);
      }

      /* ── STEP 3: Schema enforcement ─────────────────────────── */
      step = 'schema-check';
      log(`STEP 3: Validate schema version`);
      const t3 = Date.now();
      if (metadata.biSchemaVersion !== BiSchemaRegistry.BI_SCHEMA_VERSION) {
        throw new Error(
          `BI Schema version mismatch: export v${metadata.biSchemaVersion} ` +
          `≠ server v${BiSchemaRegistry.BI_SCHEMA_VERSION}.`
        );
      }
      log(`STEP 3 COMPLETE (${Date.now() - t3}ms)`);

      /* ── STEP 4: Validate datasets ──────────────────────────── */
      step = 'validate';
      log(`STEP 4: Validate datasets`);
      const t4 = Date.now();
      const { datasets, validation } = this._validateDatasets(tempDir, metadata);
      log(`STEP 4 COMPLETE (${Date.now() - t4}ms)`);
      for (const [key, v] of Object.entries(validation)) {
        log(`  ${key}: ${v.status}, ${v.rows} rows`);
      }

      /* ── Dev validation report ────────────────────────────── */
      if (DEBUG) this._printValidationReport(uploadId, metadata, validation);

      /* ── STEP 4b: Single preparation pipeline ──────────────── */
      // Both the legacy run() path and the wizard path now go through the
      // exact same dataPreparationService.prepare() so that coercion,
      // enum normalization, dedup and reconciliation behave identically.
      step = 'prepare';
      log(`STEP 4b: Data preparation (single pipeline)`);
      const prepStart = Date.now();
      const preparation = this._prepareDatasets(datasets);
      log(`STEP 4b COMPLETE (${Date.now() - prepStart}ms) — fixes=${preparation.statistics.automaticFixes} warnings=${preparation.statistics.warnings} errors=${preparation.statistics.errors} duplicatesRemoved=${preparation.statistics.duplicatesRemoved}`);

      const preparedDatasets = this._rowsToDatasets(preparation.preparedDatasets, datasets);
      const errorSkip = this._errorSkipMap(preparation.changes);

      /* ── STEP 5-6: Split across main DB + warehouse DB ──────── */
      step = 'transaction';
      log(`STEP 5: Begin DB operations`);
      const t5 = Date.now();

      /* ── Phase 1: Main DB — mark job PROCESSING ────────────── */
      log(`[DB] Phase 1: Mark job PROCESSING`);
      const job = await prisma.$transaction(async (tx) => {
        let job = await tx.biProcessingJob.findFirst({ where: { uploadId } });
        if (job) {
          job = await tx.biProcessingJob.update({
            where: { id: job.id },
            data: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null, completedAt: null, recordsLoaded: 0 },
          });
        } else {
          job = await tx.biProcessingJob.create({
            data: { uploadId, status: 'PROCESSING', startedAt: new Date() },
          });
        }
        await this._log(tx, job.id, 'INFO', 'EXTRACT', 'ETL started');
        return job;
      }, { timeout: 10000 });
      log(`[DB] BiProcessingJob id=${job.id}`);

      /* ── Phase 2: Warehouse DB — load dimensions + facts ───── */
      log(`STEP 5a: Load dimensions`);
      const dimStart = Date.now();
      const dims = await this._loadDimensions(prisma, warehousePrisma, preparedDatasets, metadata, uploadId, job, errorSkip);
      log(`STEP 5a COMPLETE (${Date.now() - dimStart}ms)`);

      log(`STEP 5b: Load facts`);
      const factStart = Date.now();
      const factResult = await this._loadFacts(prisma, warehousePrisma, preparedDatasets, metadata, uploadId, job, dims, errorSkip);
      const recordsLoaded = factResult.recordsLoaded;
      log(`STEP 5b COMPLETE (${Date.now() - factStart}ms) — ${recordsLoaded} records loaded, ${factResult.skippedRows} skipped, ${factResult.orphanWarnings.length} orphan rows`);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      /* ── Phase 3: Main DB — mark COMPLETED + create analysis request ── */
      log(`STEP 5c: Mark job COMPLETED`);
      await prisma.$transaction(async (tx) => {
        await tx.biProcessingJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date(), recordsLoaded },
        });

        await tx.biUpload.update({
          where: { id: uploadId },
          data: { status: 'COMPLETED', totalRows: recordsLoaded },
        });

        if (factResult.skippedRows > 0) {
          await this._log(tx, job.id, 'WARN', 'LOAD', `${factResult.skippedRows} invalid row(s) skipped`);
        }
        if (factResult.orphanWarnings.length > 0) {
          await this._log(tx, job.id, 'WARN', 'LOAD', `${factResult.orphanWarnings.length} orphan row(s) skipped`);
        }

        await this._log(tx, job.id, 'INFO', 'LOAD', `Pipeline completed in ${elapsed}s — ${recordsLoaded} records`);

        log(`STEP 5d: Create BiAnalysisRequest`);
        try {
          const upload = await tx.biUpload.findUnique({ where: { id: uploadId }, select: { clientId: true, businessType: true } });
          if (upload) {
            await tx.biAnalysisRequest.create({
              data: {
                clientId: upload.clientId,
                uploadId: uploadId,
                businessType: upload.businessType,
                status: 'PENDING',
              },
            });
            log(`BiAnalysisRequest created for uploadId=${uploadId}`);
          }
        } catch (arErr) {
          log(`WARN: Could not create BiAnalysisRequest: ${arErr.message}`);
        }
      }, { timeout: 10000 });

      debug('[DB] All phases committed');
      log(`STEP 6: All DB operations COMMITTED (${Date.now() - t5}ms)`);
      log(`FINISHED SUCCESSFULLY in ${elapsed}s`);

      const result = { success: true, recordsLoaded, elapsed };
      return result;

    } catch (error) {
      log(`FAILED at step "${step}"`);
      log(`error=${error.message}`);
      if (DEBUG) console.error(error.stack);

      // Try to mark upload failed for visibility
      try {
        await prisma.biUpload.update({
          where: { id: uploadId },
          data: { status: 'FAILED', errorMessage: `[${step}] ${error.message}` },
        });
      } catch {}
      try {
        await prisma.biProcessingJob.updateMany({
          where: { uploadId },
          data: { status: 'FAILED', errorMessage: `[${step}] ${error.message}`, completedAt: new Date() },
        });
      } catch {}

      throw error;
    } finally {
      if (tempDir) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        debug('Temp directory cleaned up');
      }
    }
  }

  // ─── ZIP inspection ─────────────────────────────────────────

  _inspectZip(extractDir) {
    log(`[ZIP] Files discovered:`);
    const entries = fs.readdirSync(extractDir);
    for (const entry of entries.sort()) {
      const fullPath = path.join(extractDir, entry);
      const stat = fs.statSync(fullPath);
      if (entry.endsWith('.csv')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.trim().split('\n');
        const header = lines[0] || '(empty)';
        log(`  ${entry}  rows=${lines.length - 1}  size=${stat.size}b  headers=[${header}]`);
      } else if (entry === 'metadata.json') {
        log(`  ${entry}  size=${stat.size}b`);
      } else {
        log(`  ${entry}  size=${stat.size}b`);
      }
    }
  }

  // ─── Extract ──────────────────────────────────────────────────

  _extractZipSync(zipPath) {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bi-etl-'));
    const tempZip = path.join(tempDir, 'input.zip');
    fs.copyFileSync(zipPath, tempZip);

    try {
      execSync(`unzip -o "${tempZip}" -d "${tempDir}"`, { stdio: 'pipe', timeout: 60000 });
    } catch {
      try {
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(tempZip);
        zip.extractAllTo(tempDir, true);
      } catch (e2) {
        throw new Error(`Cannot extract ZIP: ${e2.message}`);
      }
    }

    fs.unlinkSync(tempZip);
    return tempDir;
  }

  // ─── Read metadata ─────────────────────────────────────────────

  _readMetadata(extractDir) {
    const metaPath = path.join(extractDir, 'metadata.json');
    if (!fs.existsSync(metaPath)) {
      throw new Error('metadata.json not found in ZIP archive');
    }

    const raw = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    return {
      clientId: raw.client_id || 'unknown',
      businessName: raw.business_name || null,
      businessType: raw.business_type || 'unknown',
      biSchemaVersion: raw.schema_version ?? raw.bi_schema_version ?? '0.0.0',
      enabledModules: raw.enabled_modules || [],
      exportTimestamp: raw.export_timestamp || null,
    };
  }

  // ─── Validate datasets ─────────────────────────────────────────

  _validateDatasets(extractDir, metadata, lenient = false) {
    const datasets = {};
    const validation = {};
    const required = BiSchemaRegistry.REQUIRED_DATASETS;
    const optional = BiSchemaRegistry.OPTIONAL_DATASETS;
    const businessType = metadata.businessType;
    const enabledModules = Array.isArray(metadata.enabledModules) ? metadata.enabledModules : [];

    for (const ds of required) {
      const csvPath = path.join(extractDir, `${ds}.csv`);
      if (!fs.existsSync(csvPath)) {
        throw new Error(`Required dataset "${ds}.csv" not found in ZIP`);
      }
    }

    // Only optional datasets applicable to this business configuration are
    // expected. Datasets whose module is disabled or whose business type does
    // not match are hidden (the export legitimately never produces them).
    const applicableOptional = optional.filter((ds) =>
      BiSchemaRegistry.isDatasetApplicable(ds, businessType, enabledModules)
    );

    for (const ds of [...required, ...applicableOptional]) {
      const isRequired = required.includes(ds);
      const csvPath = path.join(extractDir, `${ds}.csv`);
      if (!fs.existsSync(csvPath)) {
        // Required files are enforced above; only optional files reach here.
        validation[ds] = {
          status: 'NOT_EXPORTED',
          rows: 0,
          required: false,
          severity: 'INFO',
          warnings: ['Non exporté — jeu optionnel non requis pour ce business ou cet export'],
        };
        continue;
      }

      const content = fs.readFileSync(csvPath, 'utf8').trim();
      if (!content) {
        validation[ds] = {
          status: 'EMPTY',
          rows: 0,
          required: isRequired,
          severity: isRequired ? 'WARN' : 'INFO',
          warnings: ['Fichier présent mais vide'],
        };
        continue;
      }

      const lines = content.split('\n');
      const headerLine = lines[0];
      const dataLines = lines.slice(1).filter(l => l.trim());

      const headerColumns = headerLine.split(',').map(c => c.trim());

      const colValidation = BiSchemaRegistry.validateCsvColumns(ds, headerColumns);
      if (!colValidation.valid) {
        if (required.includes(ds)) {
          throw new Error(`Validation failed for required dataset ${ds}.csv: ${colValidation.errors.join('; ')}`);
        }
        validation[ds] = {
          status: 'SKIPPED',
          rows: 0,
          required: false,
          severity: 'ERROR',
          errors: colValidation.errors,
        };
        continue;
      }

      const parsedRows = dataLines.map((line, idx) => {
        const row = BiSchemaRegistry.parseCsvRow(headerColumns, line);
        return { row, lineIndex: idx };
      });

      const typeErrors = [];
      for (const { row, lineIndex } of parsedRows) {
        const rowErrors = BiSchemaRegistry.validateCsvTypes(ds, row);
        for (const err of rowErrors) {
          typeErrors.push(`Row ${lineIndex + 2}: ${err}`);
        }
      }

      if (typeErrors.length > 0 && !lenient) {
        throw new Error(
          `Type validation failed for ${ds}.csv with ${typeErrors.length} error(s):\n  ${typeErrors.slice(0, 10).join('\n  ')}`
        );
      }

      const dupSummary = this._detectDuplicateRows(ds, parsedRows.map(p => p.row));

      datasets[ds] = { header: headerColumns, rows: parsedRows.map(p => p.row) };
      validation[ds] = {
        status: 'OK',
        rows: parsedRows.length,
        required: isRequired,
        duplicateRows: dupSummary.duplicateCount,
      };
      if (typeErrors.length > 0) {
        validation[ds].typeErrors = typeErrors.length;
        validation[ds].warnings = [`${typeErrors.length} type validation error(s) — review during preparation`];
      }
    }

    // Unexpected datasets: files present in the ZIP that the export contract
    // does not recognize. Informational only — never blocks the validation.
    for (const file of fs.readdirSync(extractDir)) {
      if (!file.toLowerCase().endsWith('.csv')) continue;
      const key = file.slice(0, -4);
      if (BiSchemaRegistry.KNOWN_POS_DATASETS.includes(key)) continue;
      validation[key] = {
        status: 'UNEXPECTED',
        rows: 0,
        required: false,
        severity: 'WARN',
        warnings: ['Jeu de données inattendu — non reconnu par le schéma BI'],
      };
    }

    return { datasets, validation };
  }

  // ─── Validation report ─────────────────────────────────────────

  _printValidationReport(uploadId, metadata, validation) {
    console.log('');
    console.log('══════════════════════════════════════════════');
    console.log('  BI ETL VALIDATION REPORT (dev mode)');
    console.log('══════════════════════════════════════════════');
    console.log(`  Upload ID:    ${uploadId}`);
    console.log(`  Client ID:    ${metadata.clientId}`);
    console.log(`  Business:     ${metadata.businessType}`);
    console.log(`  Schema:       v${metadata.biSchemaVersion}`);
    console.log(`  Export Time:  ${metadata.exportTimestamp || 'N/A'}`);
    console.log('──────────────────────────────────────────────');
    console.log('  DATASET              ROWS    STATUS');
    for (const [key, info] of Object.entries(validation)) {
      const rows = String(info.rows ?? '-').padStart(6);
      const status = info.status === 'OK' ? '✓' : info.status === 'SKIPPED' ? '–' : '✗';
      console.log(`  ${key.padEnd(20)} ${rows}  ${status}`);
      if (info.duplicateRows > 0) {
        console.log(`    ⚠ ${info.duplicateRows} duplicate row(s)`);
      }
    }
    console.log('──────────────────────────────────────────────');
    console.log('');
  }

  _detectDuplicateRows(datasetKey, rows) {
    if (!rows || rows.length === 0) return { duplicateCount: 0, examples: [] };
    const seen = new Set();
    let dupCount = 0;
    for (const row of rows) {
      const fp = JSON.stringify(row);
      if (seen.has(fp)) dupCount++;
      seen.add(fp);
    }
    return { duplicateCount: dupCount, examples: [] };
  }

  // ─── Single preparation pipeline ──────────────────────────────

  _typedRows(datasets) {
    const out = {};
    for (const [key, ds] of Object.entries(datasets || {})) {
      out[key] = Array.isArray(ds) ? ds : (ds && ds.rows) || [];
    }
    return out;
  }

  _rowsToDatasets(prepared, rawDatasets) {
    const out = {};
    for (const [key, rows] of Object.entries(prepared)) {
      out[key] = { header: (rawDatasets[key] && rawDatasets[key].header) || [], rows };
    }
    return out;
  }

  _prepareDatasets(datasets) {
    return dataPreparationService.prepare({ datasets: this._typedRows(datasets) });
  }

  // Rows carrying an ERROR-severity issue must never reach the warehouse.
  // The wizard blocks them before load; the run() path skips them and warns.
  _errorSkipMap(changes) {
    const map = {};
    for (const c of changes || []) {
      if (c.severity !== 'ERROR') continue;
      if (c.rowIndex === null || c.rowIndex === undefined) continue;
      (map[c.dataset] = map[c.dataset] || new Set()).add(c.rowIndex);
    }
    return map;
  }

  // Union of every date value across all prepared datasets (strict ISO only).
  _collectDateKeys(datasets) {
    const dates = new Set();
    for (const [key, ds] of Object.entries(datasets || {})) {
      const rows = Array.isArray(ds) ? ds : (ds && ds.rows) || [];
      const rules = DATASET_RULES[key];
      if (!rules) continue;
      for (const row of rows) {
        for (const col of rules.date) {
          const v = row && row[col];
          if (typeof v === 'string' && v.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(v)) {
            dates.add(v.substring(0, 10));
          }
        }
      }
    }
    return dates;
  }

  // ─── Load dimensions (inside transaction) ───────────────────────

  async _loadDimensions(tx, wtx, datasets, metadata, uploadId, job, skipMap = {}, overlays = null) {
    await this._log(tx, job.id, 'INFO', 'LOAD', 'Loading dimension tables');

    // DimTime — auto-seeded from every date column across all datasets.
    let timeCount = 0;
    const dates = this._collectDateKeys(datasets);
    for (const d of dates) {
      const dt = new Date(`${d}T00:00:00Z`);
      const dayOfWeek = dt.getUTCDay();
      const existing = await wtx.dimTime.findFirst({ where: { date: dt }, select: { id: true } });
      if (!existing) {
        await wtx.dimTime.create({
          data: {
            id: this._dateToInt(dt),
            date: dt,
            year: dt.getUTCFullYear(),
            quarter: Math.floor(dt.getUTCMonth() / 3) + 1,
            month: dt.getUTCMonth() + 1,
            day: dt.getUTCDate(),
            dayOfWeek,
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          },
        });
      }
      timeCount++;
    }

    // DimClient — name should be the business_name from metadata.json when
    // present, so dashboards show "Restaurant Le Gourmet" instead of a raw
    // tenant id. Fall back to the clientId when no business name is exported.
    debug('[DB] Inserting DimClient');
    const clientName = metadata.businessName || metadata.clientId;
    let dimClientId = null;
    const existingClient = await wtx.dimClient.findFirst({ where: { tenantId: metadata.clientId }, select: { id: true } });
    if (existingClient) {
      dimClientId = existingClient.id;
      await wtx.dimClient.update({
        where: { id: existingClient.id },
        data: { name: clientName, businessType: metadata.businessType, exportId: uploadId },
      });
    } else {
      const createdClient = await wtx.dimClient.create({
        data: { tenantId: metadata.clientId, exportId: uploadId, name: clientName, businessType: metadata.businessType },
      });
      dimClientId = createdClient.id;
    }

    // DimCustomer
    let custCount = 0;
    const dimCustomerIds = new Map();
    if (datasets.customers) {
      debug('[DB] Inserting Customers');
      const skip = skipMap.customers;
      const overlayTable = overlays && overlays.dimensions && overlays.dimensions.DimCustomer;
      for (let i = 0; i < datasets.customers.rows.length; i++) {
        if (skip && skip.has(i)) { custCount++; continue; }
        const row = datasets.customers.rows[i];
        const overlay = overlayTable ? overlayTable[i] : null;
        const cid = `cust_${metadata.clientId}_${row.customer_id}`;
        const lastVisit = row.last_visit_date ? this._toDate(row.last_visit_date) : null;
        const existing = await wtx.dimCustomer.findFirst({ where: { id: cid }, select: { id: true } });
        const data = {
          tenantId: metadata.clientId,
          exportId: uploadId,
          customerId: String(row.customer_id),
          name: row.name || 'Unknown Customer',
          email: row.email || null,
          phone: row.phone || null,
          address: row.address || null,
          loyaltyPoints: row.loyalty_points ?? null,
          totalSpent: row.total_spent ?? null,
          visitCount: row.visit_count ?? null,
          lastVisitDate: lastVisit,
          tags: row.tags || null,
          isActive: row.is_active ?? null,
        };
        if (overlay) Object.assign(data, overlay);
        if (existing) {
          await wtx.dimCustomer.update({ where: { id: existing.id }, data });
        } else {
          await wtx.dimCustomer.create({ data: { id: cid, ...data } });
        }
        dimCustomerIds.set(String(row.customer_id), cid);
        custCount++;
      }
    }

    // DimProduct
    let prodCount = 0;
    if (datasets.products) {
      debug('[DB] Inserting Products');
      const skip = skipMap.products;
      const overlayTable = overlays && overlays.dimensions && overlays.dimensions.DimProduct;
      for (let i = 0; i < datasets.products.rows.length; i++) {
        if (skip && skip.has(i)) { prodCount++; continue; }
        const row = datasets.products.rows[i];
        const overlay = overlayTable ? overlayTable[i] : null;
        const pid = `prod_${metadata.clientId}_${row.product_id}`;
        const existing = await wtx.dimProduct.findFirst({ where: { id: pid }, select: { id: true } });
        const data = {
          tenantId: metadata.clientId,
          exportId: uploadId,
          name: row.name,
          category: row.category,
          family: row.family,
          barcode: row.barcode,
          manageStock: row.manage_stock == null ? null : Number(row.manage_stock),
        };
        if (overlay) Object.assign(data, overlay);
        if (existing) {
          await wtx.dimProduct.update({ where: { id: existing.id }, data });
        } else {
          await wtx.dimProduct.create({
            data: {
              id: pid,
              tenantId: metadata.clientId,
              exportId: uploadId,
              productId: String(row.product_id),
              ...data,
            },
          });
        }
        prodCount++;
      }
    }

    // DimSupplier
    let suppCount = 0;
    if (datasets.suppliers) {
      debug('[DB] Inserting Suppliers');
      const skip = skipMap.suppliers;
      const overlayTable = overlays && overlays.dimensions && overlays.dimensions.DimSupplier;
      for (let i = 0; i < datasets.suppliers.rows.length; i++) {
        if (skip && skip.has(i)) { suppCount++; continue; }
        const row = datasets.suppliers.rows[i];
        const overlay = overlayTable ? overlayTable[i] : null;
        const sid = `supp_${metadata.clientId}_${row.supplier_id}`;
        const existing = await wtx.dimSupplier.findFirst({ where: { id: sid }, select: { id: true } });
        const data = {
          tenantId: metadata.clientId,
          exportId: uploadId,
          name: row.name,
          contact: row.contact,
          phone: row.phone,
          email: row.email,
        };
        if (overlay) Object.assign(data, overlay);
        if (existing) {
          await wtx.dimSupplier.update({ where: { id: existing.id }, data });
        } else {
          await wtx.dimSupplier.create({
            data: {
              id: sid,
              tenantId: metadata.clientId,
              exportId: uploadId,
              supplierId: String(row.supplier_id),
              ...data,
            },
          });
        }
        suppCount++;
      }
    }

    log(`  dims: time=${timeCount} products=${prodCount} suppliers=${suppCount} customers=${custCount}`);

    return { dimClientId, dimCustomerIds };
  }

  // ─── Load facts (inside transaction) ────────────────────────────

  async _loadFacts(tx, wtx, datasets, metadata, uploadId, job, dims = {}, skipMap = {}, overlays = null) {
    await this._log(tx, job.id, 'INFO', 'LOAD', 'Loading fact tables');

    // Replace this client's previous warehouse snapshot instead of
    // appending duplicate facts (wizard promises replacement, not accumulation).
    debug(`[DB] Replacing previous snapshot for tenantId=${metadata.clientId}`);
    await wtx.factSale.deleteMany({ where: { tenantId: metadata.clientId } });
    await wtx.factInventory.deleteMany({ where: { tenantId: metadata.clientId } });
    await wtx.factAppointment.deleteMany({ where: { tenantId: metadata.clientId } });
    await wtx.factKitchenOrder.deleteMany({ where: { tenantId: metadata.clientId } });
    await wtx.factSaleItem.deleteMany({ where: { tenantId: metadata.clientId } });
    await wtx.factKitchenOrderItem.deleteMany({ where: { tenantId: metadata.clientId } });

    const dimClientId = dims.dimClientId || null;
    const dimCustomerIds = dims.dimCustomerIds || new Map();
    const skippedRows = [];
    const orphanWarnings = [];

    const factRows = (dsKey, tableName) => {
      const rows = (datasets[dsKey] && datasets[dsKey].rows) || [];
      const skip = skipMap[dsKey];
      const overlayTable = overlays && overlays.facts && overlays.facts[tableName];
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        if (skip && skip.has(i)) { skippedRows.push(`${dsKey}:row:${i}`); continue; }
        if (overlayTable && overlayTable[i]) Object.assign(rows[i], overlayTable[i]);
        out.push(rows[i]);
      }
      return out;
    };

    // Referential-integrity guard: a fact referencing a product that is not
    // present in the products dataset is an orphan and must not be loaded.
    const productKeys = new Set();
    if (datasets.products) {
      for (const row of datasets.products.rows) {
        if (row.product_id != null) productKeys.add(String(row.product_id));
      }
    }

    let salesCount = 0, invCount = 0, aptCount = 0, kitCount = 0, siCount = 0, koiCount = 0;

    // FactSale
    if (datasets.sales) {
      debug('[DB] Inserting Sales');
      const rows = factRows('sales', 'FactSale').map(row => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        dimClientId,
        saleId: String(row.sale_id),
        customerId: row.customer_id == null ? null : String(row.customer_id),
        dimCustomerId: row.customer_id == null ? null : (dimCustomerIds.get(String(row.customer_id)) || null),
        total: row.total ?? 0,
        tax: row.tax ?? null,
        discount: row.discount ?? null,
        paymentMethod: row.payment_method,
        dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
        transactionHour: this._extractHour(row.created_at),
      }));
      for (const r of rows) {
        if (r.customerId && r.dimCustomerId == null) {
          orphanWarnings.push({ table: 'FactSale', key: r.saleId, reason: `customer_id ${r.customerId} not found in customers dataset` });
        }
      }
      salesCount = await this._insertChunked(wtx, 'factSale', rows);
    }

    // FactInventory
    if (datasets.inventory) {
      debug('[DB] Inserting Inventory');
      const rows = factRows('inventory', 'FactInventory').map((row, i) => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        rowIndex: i,
        dimProductId: `prod_${metadata.clientId}_${row.product_id}`,
        productName: row.product_name || '',
        stock: row.stock ?? 0,
        price: row.price ?? null,
        timesSold: row.times_sold ?? 0,
      }));
      invCount = await this._insertChunked(wtx, 'factInventory', rows);
    }

    // FactAppointment
    if (datasets.appointments) {
      debug('[DB] Inserting Appointments');
      const rows = factRows('appointments', 'FactAppointment').map((row, i) => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        rowIndex: i,
        dimTimeId: row.appointment_date ? this._dateToInt(new Date(`${row.appointment_date.substring(0, 10)}T00:00:00Z`)) : null,
        customerName: row.customer_name || '',
        customerPhone: row.customer_phone,
        serviceId: row.service_id == null ? null : String(row.service_id),
        duration: row.duration ?? null,
        status: row.status || 'scheduled',
      }));
      aptCount = await this._insertChunked(wtx, 'factAppointment', rows);
    }

    // FactKitchenOrder
    if (datasets.kitchen_orders) {
      debug('[DB] Inserting KitchenOrders');
      const rows = factRows('kitchen_orders', 'FactKitchenOrder').map((row, i) => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        rowIndex: i,
        dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
        orderId: row.order_id == null ? null : String(row.order_id),
        tableNumber: row.table_number ?? null,
        items: row.items,
        priority: row.priority || 'normal',
        status: row.status || 'pending',
        transactionHour: this._extractHour(row.created_at),
        startedAt: row.started_at ? this._toDate(row.started_at) : null,
        readyAt: row.ready_at ? this._toDate(row.ready_at) : null,
        completedAt: row.completed_at ? this._toDate(row.completed_at) : null,
      }));
      kitCount = await this._insertChunked(wtx, 'factKitchenOrder', rows);
    }

    // FactSaleItem (item grain — enables true product performance analytics)
    if (datasets.sale_items) {
      debug('[DB] Inserting SaleItems');
      const kept = [];
      const rows = factRows('sale_items', 'FactSaleItem');
      for (const row of rows) {
        if (row.product_id != null && !productKeys.has(String(row.product_id))) {
          orphanWarnings.push({ table: 'FactSaleItem', key: row.sale_item_id, reason: `product_id ${row.product_id} not found in products dataset` });
          continue;
        }
        kept.push(row);
      }
      const factData = kept.map(row => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        dimClientId,
        dimProductId: row.product_id == null ? null : `prod_${metadata.clientId}_${row.product_id}`,
        dimTimeId: row.sale_date ? this._dateToInt(new Date(`${row.sale_date.substring(0, 10)}T00:00:00Z`)) : null,
        saleItemId: row.sale_item_id == null ? null : String(row.sale_item_id),
        saleId: row.sale_id == null ? null : String(row.sale_id),
        productId: row.product_id == null ? null : String(row.product_id),
        quantity: row.quantity ?? 0,
        unitPrice: row.unit_price ?? null,
        lineTotal: row.line_total ?? null,
        vatRate: row.vat_rate ?? null,
        vatAmount: row.vat_amount ?? null,
        paymentMethod: row.payment_method || null,
        productName: row.product_name || null,
        category: row.category || null,
        family: row.family || null,
        transactionHour: this._extractHour(row.sale_date),
      }));
      siCount = await this._insertChunked(wtx, 'factSaleItem', factData);
    }

    // FactKitchenOrderItem (item grain for kitchen performance)
    if (datasets.kitchen_order_items) {
      debug('[DB] Inserting KitchenOrderItems');
      const kept = [];
      const rows = factRows('kitchen_order_items', 'FactKitchenOrderItem');
      for (const row of rows) {
        if (row.product_id != null && !productKeys.has(String(row.product_id))) {
          orphanWarnings.push({ table: 'FactKitchenOrderItem', key: row.kitchen_order_item_id, reason: `product_id ${row.product_id} not found in products dataset` });
          continue;
        }
        kept.push(row);
      }
      const factData = kept.map(row => ({
        tenantId: metadata.clientId,
        exportId: uploadId,
        dimClientId,
        dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
        kitchenOrderItemId: row.kitchen_order_item_id == null ? null : String(row.kitchen_order_item_id),
        orderId: row.order_id == null ? null : String(row.order_id),
        saleId: row.sale_id == null ? null : String(row.sale_id),
        productId: row.product_id == null ? null : String(row.product_id),
        productName: row.product_name || null,
        quantity: row.quantity ?? 0,
        unitPrice: row.unit_price ?? null,
        lineTotal: row.line_total ?? null,
        department: row.department || null,
        preparationTime: row.preparation_time ?? null,
        transactionHour: this._extractHour(row.created_at),
      }));
      koiCount = await this._insertChunked(wtx, 'factKitchenOrderItem', factData);
    }

    log(`  facts: sales=${salesCount} inventory=${invCount} appointments=${aptCount} kitchen=${kitCount} saleItems=${siCount} kitchenOrderItems=${koiCount}`);
    return {
      recordsLoaded: salesCount + invCount + aptCount + kitCount + siCount + koiCount,
      skippedRows,
      orphanWarnings,
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────

  async _insertChunked(wtx, model, rows, chunkSize = 1000) {
    let inserted = 0;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize);
      const res = await wtx[model].createMany({ data: chunk, skipDuplicates: true });
      inserted += res.count;
    }
    return inserted;
  }

  async _log(tx, jobId, level, step, message) {
    try {
      await tx.biProcessingLog.create({
        data: { jobId, level, step, message },
      });
    } catch (e) {
      console.error('[ETL] Failed to write log:', e.message);
    }
  }

  _dateToInt(dt) {
    if (!dt || isNaN(dt.getTime())) return 0;
    const y = dt.getUTCFullYear();
    const m = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const d = String(dt.getUTCDate()).padStart(2, '0');
    return parseInt(`${y}${m}${d}`);
  }

  // Extract the hour-of-day (0-23) from a POS timestamp like
  // "2026-08-01 06:05:22" or "2026-08-01T06:05:22". POS exports are naive
  // local time; the warehouse stores dim_time at day grain, so the business
  // hour is persisted as an integer column rather than a timestamp.
  _extractHour(value) {
    if (!value) return null;
    const m = String(value).match(/(?:[ T])(\d{2}):\d{2}/);
    if (!m) return null;
    const h = parseInt(m[1], 10);
    return h >= 0 && h <= 23 ? h : null;
  }

  _toDate(value) {
    if (!value) return null;
    const s = String(value).trim();
    if (s === '') return null;
    const dt = new Date(s.includes(' ') ? s.replace(' ', 'T') : s);
    return isNaN(dt.getTime()) ? null : dt;
  }

  // ─── Correction replay (wizard T10) ─────────────────────────────

  _factTableToDataset(table) {
    return {
      FactSale: 'sales',
      FactInventory: 'inventory',
      FactAppointment: 'appointments',
      FactKitchenOrder: 'kitchen_orders',
      FactSaleItem: 'sale_items',
      FactKitchenOrderItem: 'kitchen_order_items',
    }[table] || null;
  }

  _dimTableToDataset(table) {
    return { DimCustomer: 'customers', DimProduct: 'products', DimSupplier: 'suppliers' }[table] || null;
  }

  _columnType(datasetKey, column) {
    const rules = DATASET_RULES[datasetKey];
    if (!rules) return null;
    if (rules.integer.includes(column)) return 'integer';
    if (rules.numeric.includes(column)) return 'numeric';
    if (rules.date.includes(column)) return 'date';
    return 'text';
  }

  // Parse a reviewer-entered correction into a typed value through the same
  // strict parsers used everywhere else in the pipeline.
  _typedCorrection(datasetKey, column, rawValue) {
    const type = this._columnType(datasetKey, column);
    if (type === 'integer') return parseInteger(rawValue);
    if (type === 'numeric') return parseNumber(rawValue);
    if (type === 'date') return parseDate(rawValue);
    return { value: rawValue, invalid: false, changed: false };
  }

  // Re-validate and re-type every persisted cleaned-cell correction before
  // load so a bad reviewer edit can never reach the warehouse. Invalid
  // corrections are reported as unresolved issues and their rows skipped.
  // Sources: the persistent overlay map (all cleaned corrections, regardless
  // of whether they fixed a pre-existing ERROR) plus legacy MANUALLY_CORRECTED
  // change records from older preview files.
  _applyCleanedCorrections(datasets, previewJson, report, skipMap) {
    const merged = {};
    const add = (dataset, rowIndex, column, value) => {
      (merged[dataset] = merged[dataset] || {});
      (merged[dataset][rowIndex] = merged[dataset][rowIndex] || {})[column] = value;
    };

    const cleanedOverlays = (previewJson && previewJson.corrections && previewJson.corrections.cleaned) || {};
    for (const [table, rowOverlays] of Object.entries(cleanedOverlays)) {
      for (const [ri, changes] of Object.entries(rowOverlays)) {
        for (const [col, v] of Object.entries(changes)) add(table, Number(ri), col, v);
      }
    }
    for (const c of (previewJson && previewJson.changes) || []) {
      if (c.action !== 'MANUALLY_CORRECTED') continue;
      if (c.rowIndex === null || c.rowIndex === undefined) continue;
      add(c.dataset, c.rowIndex, c.column, c.preparedValue);
    }

    for (const [dataset, rowMap] of Object.entries(merged)) {
      const rows = datasets[dataset] && datasets[dataset].rows;
      if (!rows) continue;
      for (const [ri, changes] of Object.entries(rowMap)) {
        const rowIndex = Number(ri);
        if (!rows[rowIndex]) continue;
        for (const [column, rawValue] of Object.entries(changes)) {
          const parsed = this._typedCorrection(dataset, column, rawValue);
          if (parsed.invalid) {
            report.unresolvedIssues.push({
              dataset, rowIndex, column, value: rawValue,
              reason: `Corrected value for "${column}" is still invalid`,
            });
            (skipMap[dataset] = skipMap[dataset] || new Set()).add(rowIndex);
          } else {
            rows[rowIndex][column] = parsed.value;
            report.appliedCorrections += 1;
          }
        }
      }
    }
  }

  // Dimension/fact-section overlays (persisted at correct-time) are replayed
  // onto the freshly rebuilt rows so re-derivation can never clobber a fix.
  _replayOverlays(previewJson, report, skipMap) {
    const corrections = (previewJson && previewJson.corrections) || {};
    const typed = { dimensions: {}, facts: {} };
    for (const section of ['dimensions', 'facts']) {
      const tables = corrections[section] || {};
      for (const [table, rowOverlays] of Object.entries(tables)) {
        typed[section][table] = {};
        const datasetKey = this._factTableToDataset(table) || this._dimTableToDataset(table);
        for (const [rowIndexStr, changes] of Object.entries(rowOverlays)) {
          const rowIndex = Number(rowIndexStr);
          const typedChanges = {};
          for (const [column, rawValue] of Object.entries(changes)) {
            if (!datasetKey) { typedChanges[column] = rawValue; continue; }
            const parsed = this._typedCorrection(datasetKey, column, rawValue);
            if (parsed.invalid) {
              report.unresolvedIssues.push({
                section, table, rowIndex, column, value: rawValue,
                reason: `Corrected value for "${column}" is still invalid`,
              });
              (skipMap[datasetKey] = skipMap[datasetKey] || new Set()).add(rowIndex);
              continue;
            }
            typedChanges[column] = parsed.value;
            report.appliedCorrections += 1;
          }
          typed[section][table][rowIndex] = typedChanges;
        }
      }
    }
    return typed;
  }

  // ═══════════════════════════════════════════════════════════════
  // PUBLIC WIZARD METHODS
  // ═══════════════════════════════════════════════════════════════

  // Build the in-memory warehouse preview from typed prepared rows. Mirrors
  // the DB loaders (same coercion, same orphan/error skipping) so what the
  // wizard previews is exactly what gets loaded.
  _buildWarehouse(datasets, metadata, uploadId, changes = []) {
    const skipMap = this._errorSkipMap(changes);
    const dimensions = {};
    const facts = {};
    const skippedRows = [];
    const orphanWarnings = [];

    // DimTime — auto-seeded from every date column across all datasets.
    dimensions.DimTime = [];
    const dateKeys = this._collectDateKeys(datasets);
    for (const d of dateKeys) {
      const dt = new Date(`${d}T00:00:00Z`);
      const dow = dt.getUTCDay();
      dimensions.DimTime.push({
        id: this._dateToInt(dt), date: d,
        year: dt.getUTCFullYear(),
        quarter: Math.floor(dt.getUTCMonth() / 3) + 1,
        month: dt.getUTCMonth() + 1,
        day: dt.getUTCDate(),
        dayOfWeek: dow,
        isWeekend: dow === 0 || dow === 6,
      });
    }

    dimensions.DimClient = [{
      tenantId: metadata.clientId,
      exportId: uploadId,
      name: metadata.businessName || metadata.clientId,
      businessType: metadata.businessType,
    }];

    dimensions.DimCustomer = [];
    if (datasets.customers) {
      for (let i = 0; i < datasets.customers.rows.length; i++) {
        if (skipMap.customers && skipMap.customers.has(i)) { skippedRows.push(`customers:row:${i}`); continue; }
        const row = datasets.customers.rows[i];
        dimensions.DimCustomer.push({
          id: `cust_${metadata.clientId}_${row.customer_id}`,
          tenantId: metadata.clientId,
          exportId: uploadId,
          customerId: String(row.customer_id),
          name: row.name || 'Unknown Customer',
          email: row.email || null,
          phone: row.phone || null,
          address: row.address || null,
          loyaltyPoints: row.loyalty_points ?? null,
          totalSpent: row.total_spent ?? null,
          visitCount: row.visit_count ?? null,
          lastVisitDate: row.last_visit_date ? this._toDate(row.last_visit_date) : null,
          tags: row.tags || null,
          isActive: row.is_active ?? null,
        });
      }
    }

    dimensions.DimProduct = [];
    if (datasets.products) {
      for (let i = 0; i < datasets.products.rows.length; i++) {
        if (skipMap.products && skipMap.products.has(i)) { skippedRows.push(`products:row:${i}`); continue; }
        const row = datasets.products.rows[i];
        dimensions.DimProduct.push({
          id: `prod_${metadata.clientId}_${row.product_id}`,
          tenantId: metadata.clientId,
          exportId: uploadId,
          productId: String(row.product_id),
          name: row.name,
          category: row.category,
          family: row.family,
          barcode: row.barcode,
          manageStock: row.manage_stock == null ? null : Number(row.manage_stock),
        });
      }
    }

    dimensions.DimSupplier = [];
    if (datasets.suppliers) {
      for (let i = 0; i < datasets.suppliers.rows.length; i++) {
        if (skipMap.suppliers && skipMap.suppliers.has(i)) { skippedRows.push(`suppliers:row:${i}`); continue; }
        const row = datasets.suppliers.rows[i];
        dimensions.DimSupplier.push({
          id: `supp_${metadata.clientId}_${row.supplier_id}`,
          tenantId: metadata.clientId,
          exportId: uploadId,
          supplierId: String(row.supplier_id),
          name: row.name,
          contact: row.contact,
          phone: row.phone,
          email: row.email,
        });
      }
    }

    const productKeys = new Set();
    if (datasets.products) {
      for (const row of datasets.products.rows) {
        if (row.product_id != null) productKeys.add(String(row.product_id));
      }
    }

    const mapRows = (dsKey, tableName, mapper, skipOrphans = false) => {
      const rows = (datasets[dsKey] && datasets[dsKey].rows) || [];
      const skip = skipMap[dsKey];
      const out = [];
      for (let i = 0; i < rows.length; i++) {
        if (skip && skip.has(i)) { skippedRows.push(`${dsKey}:row:${i}`); continue; }
        const row = rows[i];
        if (skipOrphans && row.product_id != null && !productKeys.has(String(row.product_id))) {
          orphanWarnings.push({ table: tableName, key: row[tableName === 'FactSaleItem' ? 'sale_item_id' : 'kitchen_order_item_id'], reason: `product_id ${row.product_id} not found in products dataset` });
          continue;
        }
        out.push(mapper(row, i));
      }
      return out;
    };

    facts.FactSale = mapRows('sales', 'FactSale', (row) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      saleId: String(row.sale_id),
      customerId: row.customer_id == null ? null : String(row.customer_id),
      dimCustomerId: row.customer_id == null ? null : `cust_${metadata.clientId}_${row.customer_id}`,
      total: row.total ?? 0,
      tax: row.tax ?? null,
      discount: row.discount ?? null,
      paymentMethod: row.payment_method,
      dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
      transactionHour: this._extractHour(row.created_at),
    }));

    facts.FactInventory = mapRows('inventory', 'FactInventory', (row, i) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      rowIndex: i,
      dimProductId: `prod_${metadata.clientId}_${row.product_id}`,
      productName: row.product_name || '',
      stock: row.stock ?? 0,
      price: row.price ?? null,
      timesSold: row.times_sold ?? 0,
    }));

    facts.FactAppointment = mapRows('appointments', 'FactAppointment', (row, i) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      rowIndex: i,
      dimTimeId: row.appointment_date ? this._dateToInt(new Date(`${row.appointment_date.substring(0, 10)}T00:00:00Z`)) : null,
      customerName: row.customer_name || '',
      customerPhone: row.customer_phone,
      serviceId: row.service_id == null ? null : String(row.service_id),
      duration: row.duration ?? null,
      status: row.status || 'scheduled',
    }));

    facts.FactKitchenOrder = mapRows('kitchen_orders', 'FactKitchenOrder', (row, i) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      rowIndex: i,
      dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
      orderId: row.order_id == null ? null : String(row.order_id),
      tableNumber: row.table_number ?? null,
      items: row.items,
      priority: row.priority || 'normal',
      status: row.status || 'pending',
      transactionHour: this._extractHour(row.created_at),
      startedAt: row.started_at ? this._toDate(row.started_at) : null,
      readyAt: row.ready_at ? this._toDate(row.ready_at) : null,
      completedAt: row.completed_at ? this._toDate(row.completed_at) : null,
    }));

    facts.FactSaleItem = mapRows('sale_items', 'FactSaleItem', (row) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      dimClientId: null,
      dimProductId: row.product_id == null ? null : `prod_${metadata.clientId}_${row.product_id}`,
      dimTimeId: row.sale_date ? this._dateToInt(new Date(`${row.sale_date.substring(0, 10)}T00:00:00Z`)) : null,
      saleItemId: row.sale_item_id == null ? null : String(row.sale_item_id),
      saleId: row.sale_id == null ? null : String(row.sale_id),
      productId: row.product_id == null ? null : String(row.product_id),
      quantity: row.quantity ?? 0,
      unitPrice: row.unit_price ?? null,
      lineTotal: row.line_total ?? null,
      vatRate: row.vat_rate ?? null,
      vatAmount: row.vat_amount ?? null,
      paymentMethod: row.payment_method || null,
      productName: row.product_name || null,
      category: row.category || null,
      family: row.family || null,
      transactionHour: this._extractHour(row.sale_date),
    }), true);

    facts.FactKitchenOrderItem = mapRows('kitchen_order_items', 'FactKitchenOrderItem', (row) => ({
      tenantId: metadata.clientId,
      exportId: uploadId,
      dimClientId: null,
      dimTimeId: row.created_at ? this._dateToInt(new Date(`${row.created_at.substring(0, 10)}T00:00:00Z`)) : null,
      kitchenOrderItemId: row.kitchen_order_item_id == null ? null : String(row.kitchen_order_item_id),
      orderId: row.order_id == null ? null : String(row.order_id),
      saleId: row.sale_id == null ? null : String(row.sale_id),
      productId: row.product_id == null ? null : String(row.product_id),
      productName: row.product_name || null,
      quantity: row.quantity ?? 0,
      unitPrice: row.unit_price ?? null,
      lineTotal: row.line_total ?? null,
      department: row.department || null,
      preparationTime: row.preparation_time ?? null,
      transactionHour: this._extractHour(row.created_at),
    }), true);

    return { dimensions, facts, skippedRows, orphanWarnings };
  }

  async prepareWarehouse(rawDatasets, metadata, uploadId) {
    log(`[WIZARD] prepareWarehouse uploadId=${uploadId}`);

    // ── Run data preparation engine (same pipeline as run()) ────
    const preparation = this._prepareDatasets(rawDatasets);

    const cleanedDatasets = {};
    for (const [key, rows] of Object.entries(preparation.preparedDatasets)) {
      cleanedDatasets[key] = { header: (rawDatasets[key] && rawDatasets[key].header) || [], rows };
    }

    const statistics = { ...preparation.statistics, rowsRead: preparation.statistics.totalRowsProcessed };

    // ── Build dimensions + facts preview (in memory) ────────────
    const { dimensions, facts, skippedRows, orphanWarnings } = this._buildWarehouse(cleanedDatasets, metadata, uploadId, preparation.changes);

    log(`[WIZARD] Prepared: dims=${Object.values(dimensions).reduce((a, d) => a + d.length, 0)} facts=${Object.values(facts).reduce((a, f) => a + f.length, 0)}`);

    return {
      rawDatasets,
      cleanedDatasets,
      preparedDatasets: preparation.preparedDatasets,
      changes: preparation.changes,
      statistics,
      profiles: preparation.profiles,
      status: preparation.status,
      skippedRows,
      orphanWarnings,
      warehouse: { dimensions, facts },
    };
  }

  async extractAndValidate(uploadId, zipPath) {
    log(`[WIZARD] extractAndValidate uploadId=${uploadId}`);
    const tempDir = this._extractZipSync(zipPath);
    try {
      const metadata = this._readMetadata(tempDir);
      if (metadata.biSchemaVersion !== BiSchemaRegistry.BI_SCHEMA_VERSION) {
        throw new Error(
          `BI Schema version mismatch: export v${metadata.biSchemaVersion} ` +
          `≠ server v${BiSchemaRegistry.BI_SCHEMA_VERSION}.`
        );
      }
      const { datasets, validation } = this._validateDatasets(tempDir, metadata, true);
      return { metadata, datasets, validation };
    } finally {
      if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
    }
  }
  async loadIntoWarehouse(uploadId, previewJson) {
    log(`[WIZARD] loadIntoWarehouse uploadId=${uploadId}`);
    const report = { skippedRows: [], orphanWarnings: [], appliedCorrections: 0, unresolvedIssues: [] };

    if (!previewJson || !previewJson.cleanedDatasets) {
      throw new Error('No prepared data. Run prepare first.');
    }
    const datasets = previewJson.cleanedDatasets;

    // Get client info from first fact or dim
    const metadata = { clientId: null, businessType: null };
    if (previewJson.warehouse && previewJson.warehouse.dimensions && previewJson.warehouse.dimensions.DimClient.length > 0) {
      metadata.clientId = previewJson.warehouse.dimensions.DimClient[0].tenantId;
      metadata.businessType = previewJson.warehouse.dimensions.DimClient[0].businessType;
    } else {
      const upload = await prisma.biUpload.findUnique({ where: { id: uploadId } });
      if (!upload) throw new Error(`Upload ${uploadId} not found`);
      metadata.clientId = upload.clientId;
      metadata.businessType = upload.businessType;
    }

    // Replay persisted reviewer corrections: cleaned-cell fixes are re-typed
    // and re-validated; dimension/fact overlays are applied to the freshly
    // rebuilt rows so re-derivation can never clobber a fix. Rows carrying an
    // unresolved ERROR-severity issue are auto-skipped (same behaviour as the
    // run() path) since the correction phase has been removed.
    const skipMap = {};
    this._applyCleanedCorrections(datasets, previewJson, report, skipMap);
    const errorSkip = this._errorSkipMap(previewJson && previewJson.changes);
    for (const [dataset, indexes] of Object.entries(errorSkip)) {
      (skipMap[dataset] = skipMap[dataset] || new Set());
      for (const idx of indexes) skipMap[dataset].add(idx);
    }
    const overlays = this._replayOverlays(previewJson, report, skipMap);

    const startTime = Date.now();

    /* ── Phase 1: Main DB — mark job PROCESSING ────────────── */
    const job = await prisma.$transaction(async (tx) => {
      let job = await tx.biProcessingJob.findFirst({ where: { uploadId } });
      if (job) {
        job = await tx.biProcessingJob.update({
          where: { id: job.id },
          data: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null, completedAt: null, recordsLoaded: 0 },
        });
      } else {
        job = await tx.biProcessingJob.create({
          data: { uploadId, status: 'PROCESSING', startedAt: new Date() },
        });
      }
      await this._log(tx, job.id, 'INFO', 'LOAD', 'Loading dimensions from corrected data');
      return job;
    }, { timeout: 10000 });

    /* ── Phase 2: Warehouse DB — load dimensions + facts ───── */
    const dims = await this._loadDimensions(prisma, warehousePrisma, datasets, metadata, uploadId, job, skipMap, overlays);
    const factResult = await this._loadFacts(prisma, warehousePrisma, datasets, metadata, uploadId, job, dims, skipMap, overlays);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const recordsLoaded = factResult.recordsLoaded;

    /* ── Phase 3: Main DB — mark COMPLETED ─────────────────── */
    await prisma.$transaction(async (tx) => {
      await tx.biProcessingJob.update({
        where: { id: job.id },
        data: { status: 'COMPLETED', completedAt: new Date(), recordsLoaded },
      });

      await tx.biUpload.update({
        where: { id: uploadId },
        data: { status: 'COMPLETED', totalRows: recordsLoaded },
      });

      await this._log(tx, job.id, 'INFO', 'LOAD', `Warehouse load completed in ${elapsed}s — ${recordsLoaded} records (${factResult.skippedRows.length} skipped, ${factResult.orphanWarnings.length} orphan)`);
      if (report.unresolvedIssues.length > 0) {
        await this._log(tx, job.id, 'WARN', 'LOAD', `${report.unresolvedIssues.length} unresolved corrected value(s) — rows skipped`);
      }
    }, { timeout: 10000 });

    const result = {
      success: true,
      recordsLoaded,
      elapsed,
      skippedRows: factResult.skippedRows,
      orphanWarnings: factResult.orphanWarnings,
      unresolvedIssues: report.unresolvedIssues,
      appliedCorrections: report.appliedCorrections,
    };

    log(`[WIZARD] loadIntoWarehouse COMPLETE: ${result.recordsLoaded} records, ${result.appliedCorrections} corrections applied, ${result.unresolvedIssues.length} unresolved`);
    return result;
  }
}

module.exports = new EtlPipeline();
