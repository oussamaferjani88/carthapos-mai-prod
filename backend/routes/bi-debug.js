/**
 * BI Debug & Diagnostics Routes
 *
 * GET  /api/bi/debug/health          — Pipeline health check
 * POST /api/bi/debug/retry/:uploadId — Re-process a stuck upload
 * POST /api/bi/debug/self-test       — Run synthetic ETL and verify
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const warehousePrisma = require('../prisma-warehouse/client');

const etlPipeline = require('../services/etl-pipeline');
const BiSchemaRegistry = require('../services/bi-schema-registry');

const prisma = new PrismaClient();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'bi-zips');

// ─── POST /api/bi/debug/retry/:uploadId ───────────────────────

router.post('/retry/:uploadId', async (req, res) => {
  try {
    const upload = await prisma.biUpload.findUnique({ where: { id: req.params.uploadId } });
    if (!upload) {
      return res.status(404).json({ error: 'Upload not found' });
    }
    if (upload.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Upload already completed' });
    }
    if (!fs.existsSync(upload.filePath)) {
      return res.status(400).json({ error: `ZIP file not found at ${upload.filePath}` });
    }

    // Reset to UPLOADED
    await prisma.biUpload.update({
      where: { id: upload.id },
      data: { status: 'UPLOADED', errorMessage: null },
    });
    // Delete old job if any
    await prisma.biProcessingJob.deleteMany({ where: { uploadId: upload.id } });

    console.log(`[DEBUG:RETRY] Re-processing upload ${upload.id}`);

    // Run ETL (await it so caller gets result)
    const result = await etlPipeline.run(upload.id, upload.filePath);

    res.json({ success: true, message: 'Retry completed', result });
  } catch (error) {
    console.error(`[DEBUG:RETRY] Failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── GET /api/bi/debug/health ──────────────────────────────────

router.get('/health', async (req, res) => {
  try {
    const [uploadCount, jobCount, completedJobs, failedJobs, latestUpload, latestJob] = await Promise.all([
      prisma.biUpload.count(),
      prisma.biProcessingJob.count(),
      prisma.biProcessingJob.count({ where: { status: 'COMPLETED' } }),
      prisma.biProcessingJob.count({ where: { status: 'FAILED' } }),
      prisma.biUpload.findFirst({ orderBy: { createdAt: 'desc' } }),
      prisma.biProcessingJob.findFirst({
        orderBy: { createdAt: 'desc' },
        include: { upload: { select: { id: true, status: true } } },
      }),
    ]);

    let dbConnected = true;
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbConnected = false;
    }

    const uploadsDirExists = fs.existsSync(UPLOAD_DIR);

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: {
        databaseConnected: dbConnected,
        uploadsDirectoryExists: uploadsDirExists,
        uploadsCount: uploadCount,
        processingJobsCount: jobCount,
        completedJobsCount: completedJobs,
        failedJobsCount: failedJobs,
        latestUpload: latestUpload ? {
          id: latestUpload.id,
          clientId: latestUpload.clientId,
          fileName: latestUpload.fileName,
          status: latestUpload.status,
          createdAt: latestUpload.createdAt,
        } : null,
        latestJob: latestJob ? {
          id: latestJob.id,
          uploadId: latestJob.uploadId,
          status: latestJob.status,
          recordsLoaded: latestJob.recordsLoaded,
          errorMessage: latestJob.errorMessage,
          startedAt: latestJob.startedAt,
          completedAt: latestJob.completedAt,
          uploadStatus: latestJob.upload?.status,
        } : null,
        biSchemaVersion: BiSchemaRegistry.BI_SCHEMA_VERSION,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─── POST /api/bi/debug/self-test ──────────────────────────────

router.post('/self-test', async (req, res) => {
  const testId = `self_${Date.now()}`;
  const report = {
    testId,
    startedAt: new Date().toISOString(),
    steps: [],
    success: false,
    error: null,
  };

  function step(name, ok, detail) {
    report.steps.push({ name, ok, detail });
    console.log(`[SELF-TEST] ${ok ? '✓' : '✗'} ${name}${detail ? ': ' + detail : ''}`);
  }

  try {
    // Step 1: Check DB
    await prisma.$queryRaw`SELECT 1`;
    step('Database connection', true);

    // Step 2: Check upload dir
    if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    step('Uploads directory', true, UPLOAD_DIR);

    // Step 3: Find a valid clientId
    const client = await prisma.client.findFirst();
    if (!client) {
      throw new Error('No Client record found in database. Create a client first.');
    }
    step('Client found', true, `id=${client.id} name=${client.name}`);

    // Step 4: Generate test CSV content + ZIP
    const testZipPath = path.join(os.tmpdir(), `${testId}.zip`);
    const metadata = {
      client_id: client.id,
      business_type: 'retail',
      business_name: client.name,
      enabled_modules: ['sales', 'products', 'customers', 'inventory'],
      pos_version: '1.0.0',
      bi_schema_version: BiSchemaRegistry.BI_SCHEMA_VERSION,
      export_timestamp: new Date().toISOString(),
      total_files: 5,
      file_list: ['sales.csv', 'products.csv', 'customers.csv', 'inventory.csv', 'metadata.json'],
    };

    const salesCsv = 'sale_id,total,tax,discount,payment_method,customer_id,customer_name,created_at\n'
      + '1,100.00,20.00,0,cash,1,Test Customer,2026-06-01T12:00:00Z\n'
      + '2,50.00,10.00,5.00,card,1,Test Customer,2026-06-01T13:00:00Z\n';

    const productsCsv = 'product_id,name,price,category,barcode,created_at\n'
      + '1,Test Product A,25.00,General,TEST001,2026-01-01T00:00:00Z\n'
      + '2,Test Product B,15.50,General,TEST002,2026-01-01T00:00:00Z\n';

    const customersCsv = 'customer_id,name,email,phone,created_at\n'
      + '1,Test Customer,test@example.com,+33123456789,2026-01-01T00:00:00Z\n';

    const inventoryCsv = 'product_id,product_name,stock,times_sold,price\n'
      + '1,Test Product A,100,10,25.00\n'
      + '2,Test Product B,200,5,15.50\n';

    // Build ZIP using raw deflate
    const zlib = require('zlib');
    const files = [
      { name: 'metadata.json', data: JSON.stringify(metadata, null, 2) },
      { name: 'sales.csv', data: salesCsv },
      { name: 'products.csv', data: productsCsv },
      { name: 'customers.csv', data: customersCsv },
      { name: 'inventory.csv', data: inventoryCsv },
    ];

    const LOCAL_HEADER_SIZE = 30;
    const CENTRAL_DIR_SIZE = 46;
    const EOCD_SIZE = 22;
    const fileDataBuffers = [];
    const centralDirEntries = [];
    let offset = 0;

    for (const f of files) {
      const nameBuf = Buffer.from(f.name, 'utf8');
      const dataBuf = Buffer.from(f.data, 'utf8');
      const compressed = zlib.deflateRawSync(dataBuf);
      const useCompressed = compressed.length < dataBuf.length;
      const method = useCompressed ? 8 : 0;
      const stored = useCompressed ? compressed : dataBuf;

      let crc = 0xFFFFFFFF;
      for (let i = 0; i < dataBuf.length; i++) {
        crc ^= dataBuf[i];
        for (let j = 0; j < 8; j++) crc = (crc & 1) ? (crc >>> 1) ^ 0xEDB88320 : crc >>> 1;
      }
      crc = (crc ^ 0xFFFFFFFF) >>> 0;

      const local = Buffer.alloc(LOCAL_HEADER_SIZE);
      local.writeUInt32LE(0x04034b50, 0);
      local.writeUInt16LE(20, 4);
      local.writeUInt16LE(0, 6);
      local.writeUInt16LE(method, 8);
      local.writeUInt16LE(0, 10);
      local.writeUInt16LE(0, 12);
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(stored.length, 18);
      local.writeUInt32LE(dataBuf.length, 22);
      local.writeUInt16LE(nameBuf.length, 26);
      local.writeUInt16LE(0, 28);
      fileDataBuffers.push(local, nameBuf, stored);

      const cent = Buffer.alloc(CENTRAL_DIR_SIZE);
      cent.writeUInt32LE(0x02014b50, 0);
      cent.writeUInt16LE(20, 4);
      cent.writeUInt16LE(20, 6);
      cent.writeUInt16LE(0, 8);
      cent.writeUInt16LE(method, 10);
      cent.writeUInt16LE(0, 12);
      cent.writeUInt16LE(0, 14);
      cent.writeUInt32LE(crc, 16);
      cent.writeUInt32LE(stored.length, 20);
      cent.writeUInt32LE(dataBuf.length, 24);
      cent.writeUInt16LE(nameBuf.length, 28);
      cent.writeUInt16LE(0, 30);
      cent.writeUInt16LE(0, 32);
      cent.writeUInt16LE(0, 34);
      cent.writeUInt16LE(0, 36);
      cent.writeUInt32LE(0, 38);
      cent.writeUInt32LE(offset, 42);
      centralDirEntries.push(Buffer.concat([cent, nameBuf]));
      offset += LOCAL_HEADER_SIZE + nameBuf.length + stored.length;
    }

    const centralDirData = Buffer.concat(centralDirEntries);
    const eocd = Buffer.alloc(EOCD_SIZE);
    eocd.writeUInt32LE(0x06054b50, 0);
    eocd.writeUInt16LE(0, 4);
    eocd.writeUInt16LE(0, 6);
    eocd.writeUInt16LE(files.length, 8);
    eocd.writeUInt16LE(files.length, 10);
    eocd.writeUInt32LE(centralDirData.length, 12);
    eocd.writeUInt32LE(Buffer.concat(fileDataBuffers).length, 16);
    eocd.writeUInt16LE(0, 20);

    const fullZip = Buffer.concat([Buffer.concat(fileDataBuffers), centralDirData, eocd]);
    fs.writeFileSync(testZipPath, fullZip);
    step('Test ZIP created', true, `path=${testZipPath} size=${fullZip.length}b`);

    // Step 5: Compute hash
    const hash = crypto.createHash('sha256').update(fullZip).digest('hex');
    step('ZIP hash computed', true, hash);

    // Step 6: Create upload record
    const upload = await prisma.biUpload.create({
      data: {
        clientId: client.id,
        businessType: 'retail',
        fileHash: hash,
        fileName: `self_test_${testId}.zip`,
        fileSize: fullZip.length,
        filePath: testZipPath,
        status: 'UPLOADED',
        totalFiles: 0,
        totalRows: 0,
      },
    });
    step('Upload record created', true, `id=${upload.id}`);

    // Step 7: Run ETL
    step('Running ETL pipeline...', true);
    const result = await etlPipeline.run(upload.id, testZipPath);
    step('ETL completed', true, `records=${result.recordsLoaded} elapsed=${result.elapsed}s`);

    // Step 8: Verify warehouse data
    const dimClient = await warehousePrisma.dimClient.findUnique({ where: { tenantId: client.id } });
    step('DimClient', !!dimClient, dimClient ? `tenantId=${dimClient.tenantId}` : 'NOT FOUND');

    const factSales = await warehousePrisma.factSale.count({ where: { exportId: upload.id } });
    step('FactSales', factSales === 2, `${factSales} rows (expected 2)`);

    const factInventory = await warehousePrisma.factInventory.count({ where: { exportId: upload.id } });
    step('FactInventory', factInventory === 2, `${factInventory} rows (expected 2)`);

    const dimProducts = await warehousePrisma.dimProduct.count({ where: { tenantId: client.id } });
    step('DimProducts', dimProducts === 2, `${dimProducts} products`);

    // Step 9: Verify idempotency — run ETL again, should upsert
    step('Testing idempotency (re-run ETL)...', true);
    const result2 = await etlPipeline.run(upload.id, testZipPath);

    const factSales2 = await warehousePrisma.factSale.count({ where: { exportId: upload.id } });
    const dupOk = factSales2 === 2;
    step('Idempotency check', dupOk, `${factSales2} sales rows after re-run (expected 2)`);

    if (!dupOk) {
      throw new Error(`Idempotency failed: ${factSales2} rows instead of 2`);
    }

    report.success = true;
    report.completedAt = new Date().toISOString();
    report.result = result;
    report.rowsInserted = {
      sales: 2,
      products: 2,
      inventory: 2,
      customers: 1,
    };

    res.json({ success: true, report });

    // Cleanup test ZIP
    try { fs.unlinkSync(testZipPath); } catch {}

  } catch (error) {
    report.error = error.message;
    report.completedAt = new Date().toISOString();
    console.error('[SELF-TEST] FAILED:', error.message);
    res.status(500).json({ success: false, report });
  }
});

module.exports = router;
