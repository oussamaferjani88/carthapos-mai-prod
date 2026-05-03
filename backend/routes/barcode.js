const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

// GET /api/barcode/generate - Generate barcode for product
// POST /api/barcode/generate - Generate a new unique barcode
router.post('/generate', async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Generate EAN-13 barcode (simple implementation)
    const timestamp = Date.now().toString();
    const barcode = `200${productId.padStart(4, '0')}${timestamp.slice(-5)}`;
    
    // Calculate check digit for EAN-13
    const digits = barcode.split('').map(Number);
    let sum = 0;
    for (let i = 0; i < digits.length; i++) {
      sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    const fullBarcode = barcode + checkDigit;

    res.json({
      productId,
      barcode: fullBarcode,
      format: 'EAN-13',
      generated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error generating barcode:', error);
    res.status(500).json({ error: 'Failed to generate barcode' });
  }
});

// POST /api/barcode/scan - Process scanned barcode
router.post('/scan', async (req, res) => {
  try {
    const { barcode, scannerId } = req.body;

    if (!barcode) {
      return res.status(400).json({ error: 'Barcode is required' });
    }

    // Look for product with this barcode
    // Note: This would need a barcode field in the products table
    const scanResult = {
      barcode,
      scannerId: scannerId || 'default',
      timestamp: new Date().toISOString(),
      found: false,
      product: null
    };

    // Mock product lookup - in real implementation, you'd search products table
    if (barcode.startsWith('200')) {
      scanResult.found = true;
      scanResult.product = {
        id: barcode.slice(3, 7),
        name: `Product ${barcode.slice(3, 7)}`,
        price: 15.99,
        stock: 25
      };
    }

    res.json(scanResult);
  } catch (error) {
    console.error('Error processing barcode scan:', error);
    res.status(500).json({ error: 'Failed to process barcode scan' });
  }
});

// GET /api/barcode/products - Get products with barcodes
router.get('/products', async (req, res) => {
  try {
    // Mock data - in real implementation, filter products with barcodes
    const products = [
      {
        id: 1,
        name: 'Café Expresso',
        barcode: '2000100012345',
        price: 2.50,
        stock: 100,
        category: 'Boissons'
      },
      {
        id: 2,
        name: 'Croissant',
        barcode: '2000200023456',
        price: 1.80,
        stock: 50,
        category: 'Pâtisserie'
      },
      {
        id: 3,
        name: 'Sandwich Jambon',
        barcode: '2000300034567',
        price: 4.50,
        stock: 30,
        category: 'Snacks'
      }
    ];

    res.json(products);
  } catch (error) {
    console.error('Error fetching products with barcodes:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/barcode/print - Print barcode labels
router.post('/print', async (req, res) => {
  try {
    const { barcodes, printerSettings } = req.body;

    if (!barcodes || !Array.isArray(barcodes)) {
      return res.status(400).json({ error: 'Barcodes array is required' });
    }

    const printJob = {
      id: Date.now().toString(),
      barcodes: barcodes.length,
      status: 'queued',
      createdAt: new Date().toISOString(),
      printerSettings: printerSettings || {
        format: 'labels',
        size: '40x30mm',
        copies: 1
      }
    };

    // Mock print processing
    setTimeout(() => {
      printJob.status = 'completed';
    }, 2000);

    res.json(printJob);
  } catch (error) {
    console.error('Error printing barcodes:', error);
    res.status(500).json({ error: 'Failed to print barcodes' });
  }
});

module.exports = router;