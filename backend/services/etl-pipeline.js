const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const BiSchemaRegistry = require('./bi-schema-registry');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

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

      /* ── STEP 5-6: DB transaction ───────────────────────────── */
      step = 'transaction';
      log(`STEP 5: Begin DB transaction`);
      const t5 = Date.now();

      const result = await prisma.$transaction(async (tx) => {
        debug('[DB] Transaction started');

        /* ── Create/update job ──────────────────────────────── */
        log(`[DB] Upsert BiProcessingJob`);
        const job = await tx.biProcessingJob.upsert({
          where: { uploadId },
          update: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null, completedAt: null, recordsLoaded: 0 },
          create: { uploadId, status: 'PROCESSING', startedAt: new Date() },
        });
        log(`[DB] BiProcessingJob id=${job.id}`);

        await this._log(tx, job.id, 'INFO', 'EXTRACT', 'ETL started');

        /* ── Load dimensions ─────────────────────────────────── */
        log(`STEP 5a: Load dimensions`);
        const dimStart = Date.now();
        await this._loadDimensions(tx, datasets, metadata, uploadId, job);
        log(`STEP 5a COMPLETE (${Date.now() - dimStart}ms)`);

        /* ── Load facts ───────────────────────────────────────── */
        log(`STEP 5b: Load facts`);
        const factStart = Date.now();
        const recordsLoaded = await this._loadFacts(tx, datasets, metadata, uploadId, job);
        log(`STEP 5b COMPLETE (${Date.now() - factStart}ms) — ${recordsLoaded} records`);

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        /* ── Mark COMPLETED ──────────────────────────────────── */
        log(`STEP 5c: Mark job COMPLETED`);
        await tx.biProcessingJob.update({
          where: { id: job.id },
          data: { status: 'COMPLETED', completedAt: new Date(), recordsLoaded },
        });

        log(`STEP 5d: Mark upload COMPLETED`);
        await tx.biUpload.update({
          where: { id: uploadId },
          data: { status: 'COMPLETED', totalRows: recordsLoaded },
        });

        await this._log(tx, job.id, 'INFO', 'LOAD', `Pipeline completed in ${elapsed}s — ${recordsLoaded} records`);

        /* ── Phase 3: Auto-create BiAnalysisRequest ──────────── */
        log(`STEP 5e: Create BiAnalysisRequest`);
        try {
          const upload = await tx.biUpload.findUnique({ where: { id: uploadId }, select: { clientId: true, businessType: true, licenseId: true } });
          if (upload) {
            await tx.biAnalysisRequest.create({
              data: {
                clientId: upload.clientId,
                licenseId: upload.licenseId || null,
                uploadId: uploadId,
                businessType: upload.businessType,
                status: 'PENDING',
              },
            });
            log(`BiAnalysisRequest created for uploadId=${uploadId}`);
          }
        } catch (arErr) {
          // Non-fatal: analysis request creation failure should not break ETL
          log(`WARN: Could not create BiAnalysisRequest: ${arErr.message}`);
        }

        debug('[DB] Transaction committed');
        log(`STEP 6: Transaction COMMITTED (${Date.now() - t5}ms)`);
        log(`FINISHED SUCCESSFULLY in ${elapsed}s`);

        return { success: true, recordsLoaded, elapsed };
      });

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
      businessType: raw.business_type || 'unknown',
      biSchemaVersion: raw.bi_schema_version || '0.0.0',
      enabledModules: raw.enabled_modules || [],
      exportTimestamp: raw.export_timestamp || null,
    };
  }

  // ─── Validate datasets ─────────────────────────────────────────

  _validateDatasets(extractDir, metadata) {
    const datasets = {};
    const validation = {};
    const required = BiSchemaRegistry.REQUIRED_DATASETS;
    const all = BiSchemaRegistry.ALL_DATASETS;

    for (const ds of required) {
      const csvPath = path.join(extractDir, `${ds}.csv`);
      if (!fs.existsSync(csvPath)) {
        throw new Error(`Required dataset "${ds}.csv" not found in ZIP`);
      }
    }

    for (const ds of all) {
      const csvPath = path.join(extractDir, `${ds}.csv`);
      if (!fs.existsSync(csvPath)) {
        validation[ds] = { status: 'SKIPPED', rows: 0, warnings: ['File not found'] };
        continue;
      }

      const content = fs.readFileSync(csvPath, 'utf8').trim();
      if (!content) {
        validation[ds] = { status: 'SKIPPED', rows: 0, warnings: ['Empty file'] };
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
        validation[ds] = { status: 'SKIPPED', rows: 0, errors: colValidation.errors };
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

      if (typeErrors.length > 0) {
        throw new Error(
          `Type validation failed for ${ds}.csv with ${typeErrors.length} error(s):\n  ${typeErrors.slice(0, 10).join('\n  ')}`
        );
      }

      const dupSummary = this._detectDuplicateRows(ds, parsedRows.map(p => p.row));

      datasets[ds] = { header: headerColumns, rows: parsedRows.map(p => p.row) };
      validation[ds] = {
        status: 'OK',
        rows: parsedRows.length,
        duplicateRows: dupSummary.duplicateCount,
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

  // ─── Load dimensions (inside transaction) ───────────────────────

  async _loadDimensions(tx, datasets, metadata, uploadId, job) {
    await this._log(tx, job.id, 'INFO', 'LOAD', 'Loading dimension tables');

    // DimTime
    let timeCount = 0;
    if (datasets.sales) {
      const dates = new Set();
      for (const row of datasets.sales.rows) {
        if (row.created_at) {
          const d = row.created_at.substring(0, 10);
          if (d) dates.add(d);
        }
      }
      for (const d of dates) {
        const dt = new Date(d);
        const dayOfWeek = dt.getUTCDay();
        await tx.dimTime.upsert({
          where: { date: dt },
          update: {},
          create: {
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
        timeCount++;
      }
    }

    // DimClient
    debug('[DB] Inserting DimClient');
    await tx.dimClient.upsert({
      where: { tenantId: metadata.clientId },
      update: { name: metadata.clientId, businessType: metadata.businessType, exportId: uploadId },
      create: { tenantId: metadata.clientId, exportId: uploadId, name: metadata.clientId, businessType: metadata.businessType },
    });

    // DimProduct
    let prodCount = 0;
    if (datasets.products) {
      debug('[DB] Inserting Products');
      for (const row of datasets.products.rows) {
        await tx.dimProduct.upsert({
          where: { id: `prod_${metadata.clientId}_${row.product_id}` },
          update: { name: row.name, category: row.category, family: row.family, barcode: row.barcode },
          create: {
            id: `prod_${metadata.clientId}_${row.product_id}`,
            tenantId: metadata.clientId,
            exportId: uploadId,
            productId: String(row.product_id),
            name: row.name,
            category: row.category,
            family: row.family,
            barcode: row.barcode,
          },
        });
        prodCount++;
      }
    }

    // DimSupplier
    let suppCount = 0;
    if (datasets.suppliers) {
      debug('[DB] Inserting Suppliers');
      for (const row of datasets.suppliers.rows) {
        await tx.dimSupplier.upsert({
          where: { id: `supp_${metadata.clientId}_${row.supplier_id}` },
          update: { name: row.name, contact: row.contact, phone: row.phone, email: row.email },
          create: {
            id: `supp_${metadata.clientId}_${row.supplier_id}`,
            tenantId: metadata.clientId,
            exportId: uploadId,
            supplierId: String(row.supplier_id),
            name: row.name,
            contact: row.contact,
            phone: row.phone,
            email: row.email,
          },
        });
        suppCount++;
      }
    }

    log(`  dims: time=${timeCount} products=${prodCount} suppliers=${suppCount}`);
  }

  // ─── Load facts (inside transaction) ────────────────────────────

  async _loadFacts(tx, datasets, metadata, uploadId, job) {
    await this._log(tx, job.id, 'INFO', 'LOAD', 'Loading fact tables');
    let salesCount = 0, invCount = 0, aptCount = 0, kitCount = 0;

    // FactSale
    if (datasets.sales) {
      debug('[DB] Inserting Sales');
      for (const row of datasets.sales.rows) {
        const dimTimeId = row.created_at ? this._dateToInt(new Date(row.created_at.substring(0, 10))) : null;
        await tx.factSale.upsert({
          where: { exportId_saleId: { exportId: uploadId, saleId: String(row.sale_id) } },
          update: {},
          create: {
            tenantId: metadata.clientId,
            exportId: uploadId,
            saleId: String(row.sale_id),
            total: parseFloat(row.total) || 0,
            tax: row.tax ? parseFloat(row.tax) : null,
            discount: row.discount ? parseFloat(row.discount) : null,
            paymentMethod: row.payment_method,
            dimTimeId,
          },
        });
        salesCount++;
      }
    }

    // FactInventory
    if (datasets.inventory) {
      debug('[DB] Inserting Inventory');
      for (const [i, row] of datasets.inventory.rows.entries()) {
        const dimProductId = `prod_${metadata.clientId}_${row.product_id}`;
        await tx.factInventory.upsert({
          where: { exportId_rowIndex: { exportId: uploadId, rowIndex: i } },
          update: {},
          create: {
            tenantId: metadata.clientId,
            exportId: uploadId,
            rowIndex: i,
            dimProductId,
            productName: row.product_name || '',
            stock: parseInt(row.stock) || 0,
            price: row.price ? parseFloat(row.price) : null,
            timesSold: parseInt(row.times_sold) || 0,
          },
        });
        invCount++;
      }
    }

    // FactAppointment
    if (datasets.appointments) {
      debug('[DB] Inserting Appointments');
      for (const [i, row] of datasets.appointments.rows.entries()) {
        const dimTimeId = row.appointment_date ? this._dateToInt(new Date(row.appointment_date.substring(0, 10))) : null;
        await tx.factAppointment.upsert({
          where: { exportId_rowIndex: { exportId: uploadId, rowIndex: i } },
          update: {},
          create: {
            tenantId: metadata.clientId,
            exportId: uploadId,
            rowIndex: i,
            dimTimeId,
            customerName: row.customer_name || '',
            customerPhone: row.customer_phone,
            serviceId: row.service_id ? String(row.service_id) : null,
            duration: row.duration ? parseInt(row.duration) : null,
            status: row.status || 'scheduled',
          },
        });
        aptCount++;
      }
    }

    // FactKitchenOrder
    if (datasets.kitchen_orders) {
      debug('[DB] Inserting KitchenOrders');
      for (const [i, row] of datasets.kitchen_orders.rows.entries()) {
        const dimTimeId = row.created_at ? this._dateToInt(new Date(row.created_at.substring(0, 10))) : null;
        await tx.factKitchenOrder.upsert({
          where: { exportId_rowIndex: { exportId: uploadId, rowIndex: i } },
          update: {},
          create: {
            tenantId: metadata.clientId,
            exportId: uploadId,
            rowIndex: i,
            dimTimeId,
            tableNumber: row.table_number ? parseInt(String(row.table_number).replace(/^[^\d-]+/, '')) || null : null,
            items: row.items,
            priority: row.priority || 'normal',
            status: row.status || 'pending',
          },
        });
        kitCount++;
      }
    }

    log(`  facts: sales=${salesCount} inventory=${invCount} appointments=${aptCount} kitchen=${kitCount}`);
    return salesCount + invCount + aptCount + kitCount;
  }

  // ─── Helpers ──────────────────────────────────────────────────

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
}

module.exports = new EtlPipeline();
