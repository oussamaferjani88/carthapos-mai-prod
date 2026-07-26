/**
 * Sales IPC Handlers
 * Atomic transactions, full metadata persistence, kitchen orders, hold/recall
 *
 * Kitchen order creation is centralized via createKitchenOrder() from ipc-kitchen-handlers.
 * KEY FIX: Kitchen orders are ONLY created for non-pending (paid) sales.
 *          Pending sales create kitchen orders only when completed via complete-pending-sale.
 *          This prevents duplicate kitchen orders for the same sale.
 */

const { createKitchenOrder } = require('./ipc-kitchen-handlers.cjs');

function registerSalesHandlers(ipcMainInstance, databaseManager) {
  console.log('💰 Registering sales IPC handlers...');

  const getDb = () => databaseManager.getDatabase();
  const db = getDb();
  if (!db) {
    console.warn('⚠️ Database not available for sales handlers');
    return;
  }

  // ── Add Sale (atomic transaction) ──────────────────────────────────
  ipcMainInstance.handle('add-sale', async (event, sale) => {
    const {
      items, subtotal, total, tax, discount, discount_percentage,
      payment_method, customer_id, user_id, table_id, notes, status
    } = sale;

    if (!items || items.length === 0) {
      throw new Error('Sale must contain at least one item');
    }
    if (!user_id) {
      throw new Error('user_id is required');
    }

    const saleStatus = status || 'paid';
    const isPending = saleStatus === 'pending';

    return databaseManager.runTransaction(async ({ run, get, all }) => {
      // 0. Find active shift to link sale to it
      const activeShift = await get(
        `SELECT id, cash_sales, card_sales, other_sales FROM shifts
         WHERE status = 'open' AND user_id = ? ORDER BY opened_at DESC LIMIT 1`,
        [user_id]
      );

      // 1. Insert sale header (with shift_id if shift is active)
      const saleResult = await run(
        `INSERT INTO sales (subtotal, total, tax, discount, payment_method, customer_id, user_id, table_id, notes, shift_id, status, kitchen_status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subtotal || 0,
          total || 0,
          tax || 0,
          discount || 0,
          isPending ? 'pending' : (payment_method || 'cash'),
          customer_id || null,
          user_id,
          table_id || null,
          notes || '',
          activeShift ? activeShift.id : null,
          saleStatus,
          isPending ? 'not_started' : 'pending'
        ]
      );
      const saleId = saleResult.lastID;

      const receiptNumber = `R${String(saleId).padStart(6, '0')}`;
      await run('UPDATE sales SET receipt_number = ? WHERE id = ?', [receiptNumber, saleId]);

      // 2. Insert sale items + record inventory movements
      const userRow = await get('SELECT full_name FROM users WHERE id = ?', [user_id]);
      const userName = userRow?.full_name || `User #${user_id}`;

      for (const item of items) {
        const itemVatRate = item.vat_rate || 0;
        const itemVatAmount = item.vat_amount || 0;
        await run(
          `INSERT INTO sale_items (sale_id, product_id, quantity, price, vat_rate, vat_amount) VALUES (?, ?, ?, ?, ?, ?)`,
          [saleId, item.id, item.quantity, item.price, itemVatRate, itemVatAmount]
        );

        if (!isPending) {
          // Stock deduction: allow zero/negative stock (warning only, never block sale)
          const stockBefore = (await get('SELECT stock FROM products WHERE id = ?', [item.id]))?.stock || 0;
          await run(
            'UPDATE products SET stock = stock - ? WHERE id = ?',
            [item.quantity, item.id]
          );
          const stockAfter = stockBefore - item.quantity;

          await run(
             `INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, reference, user_name)
              VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?)`,
            [item.id, item.name || `Product #${item.id}`, item.quantity, stockBefore, stockAfter,
             `Vente #${saleId}`, `SALE-${saleId}`, userName]
          );
        }
      }

      // 3. Free the table if one was assigned
      if (table_id) {
        await run(
          'UPDATE restaurant_tables SET status = ? WHERE id = ?',
          ['available', table_id]
        );
      }

      if (!isPending) {
        // 4. Update customer stats if customer_id provided
        if (customer_id) {
          const custRow = await get(
            'SELECT visit_count, total_spent, loyalty_points FROM customers WHERE id = ?',
            [customer_id]
          );

          if (custRow) {
            const earnedPoints = Math.floor(total || 0);
            await run(
              `UPDATE customers SET
                visit_count = visit_count + 1,
                total_spent = total_spent + ?,
                loyalty_points = loyalty_points + ?,
                last_visit_date = datetime('now'),
                updated_at = datetime('now')
               WHERE id = ?`,
              [total || 0, earnedPoints, customer_id]
            );
          }
        }

        // 5. Update active shift totals
        if (activeShift) {
          const payMethod = (payment_method || 'cash').toLowerCase();
          let cashInc = 0, cardInc = 0, otherInc = 0;
          if (payMethod === 'cash' || payMethod === 'espèces' || payMethod === 'especes') {
            cashInc = total || 0;
          } else if (payMethod === 'card' || payMethod === 'carte') {
            cardInc = total || 0;
          } else {
            otherInc = total || 0;
          }

          await run(
            `UPDATE shifts SET
              cash_sales  = COALESCE(cash_sales, 0) + ?,
              card_sales  = COALESCE(card_sales, 0) + ?,
              other_sales = COALESCE(other_sales, 0) + ?
             WHERE id = ?`,
            [cashInc, cardInc, otherInc, activeShift.id]
          );
        }
      }

      // 6. Create kitchen orders by department (ALWAYS — any payment method, pending or paid)
      {
        const tableNumber = table_id
          ? ((await get('SELECT table_number FROM restaurant_tables WHERE id = ?', [table_id]))?.table_number || String(table_id))
          : 'Comptoir';
        const serverName = userRow?.full_name || `User #${user_id}`;

        // Look up product kitchen settings
        const productIds = items.map(i => i.id).filter(Boolean);
        let productKitchenMap = {};
        if (productIds.length > 0) {
          const placeholders = productIds.map(() => '?').join(',');
          const productRows = await all(
            `SELECT id, requires_kitchen, preparation_department, preparation_time FROM products WHERE id IN (${placeholders})`,
            productIds
          );
          for (const row of productRows) {
            productKitchenMap[row.id] = row;
          }
        }

        // Split items by department
        const departmentGroups = {};
        let maxPrepTime = null;

        for (const item of items) {
          const productInfo = productKitchenMap[item.id];
          const isKitchen = productInfo?.requires_kitchen === 1 || productInfo?.requires_kitchen === true;
          if (!isKitchen) continue;

          const dept = productInfo?.preparation_department || 'Cuisine';
          if (!departmentGroups[dept]) departmentGroups[dept] = [];
          departmentGroups[dept].push({
            id: item.id,
            name: item.name,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price,
            preparation_time: productInfo?.preparation_time || null
          });

          if (productInfo?.preparation_time) {
            maxPrepTime = maxPrepTime ? Math.max(maxPrepTime, productInfo.preparation_time) : productInfo.preparation_time;
          }
        }

        // Create one kitchen order per department
        for (const [department, deptItems] of Object.entries(departmentGroups)) {
          try {
            await createKitchenOrder(databaseManager, {
              table_number: tableNumber,
              items: deptItems,
              notes: notes || '',
              priority: 'normal',
              sale_id: saleId,
              total: deptItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
              server_name: serverName,
              customer_name: '',
              department,
              estimated_minutes: maxPrepTime,
            });
          } catch (kitchenErr) {
            console.error(`[Sales] Failed to create kitchen order for dept "${department}":`, kitchenErr.message);
          }
        }
      }

      console.log(`✅ Sale #${saleId} completed (atomic, user=${user_id})`);
      return { id: saleId, receipt_number: receiptNumber };
    });
  });

  // ── Get Sales ──────────────────────────────────────────────────────
  ipcMainInstance.handle('get-sales', async () => {
    return databaseManager.getData(
      'SELECT s.*, u.full_name as user_name FROM sales s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC'
    );
  });

  // ── Get Sale Details ───────────────────────────────────────────────
  ipcMainInstance.handle('get-sale-details', async (event, id) => {
    const row = await databaseManager.getRow(
      `SELECT s.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone
       FROM sales s LEFT JOIN customers c ON s.customer_id = c.id WHERE s.id = ?`, [id]
    );
    if (!row) return null;

    const items = await databaseManager.getData(
      `SELECT si.*, p.name as product_name FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`, [id]
    );
    row.items = items || [];
    return row;
  });

  // ── Get Sales Data (for reports) ───────────────────────────────────
  ipcMainInstance.handle('get-sales-data', async () => {
    return databaseManager.getData(
      `SELECT s.*, u.full_name as user_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ORDER BY s.created_at DESC`
    );
  });

  // ── Cancel Sale (cascade: cancel kitchen orders + restore stock) ──
  ipcMainInstance.handle('cancel-sale', async (event, saleId) => {
    const sale = await databaseManager.getRow('SELECT * FROM sales WHERE id = ?', [saleId]);
    if (!sale) throw new Error('Sale not found');
    if (sale.status === 'cancelled') throw new Error('Sale already cancelled');

    await databaseManager.runTransaction(async ({ run, get, all }) => {
      // 1. Mark sale as cancelled
      await run("UPDATE sales SET status = 'cancelled', kitchen_status = 'cancelled', updated_at = datetime('now') WHERE id = ?", [saleId]);

      // 2. Cancel active kitchen orders for this sale
      const kitchenOrders = await all(
        "SELECT id, status FROM kitchen_orders WHERE sale_id = ? AND status NOT IN ('completed', 'cancelled')",
        [saleId]
      );
      for (const ko of kitchenOrders) {
        await run(
          "UPDATE kitchen_orders SET status = 'cancelled', cancel_reason = 'Vente annulée', completed_at = COALESCE(completed_at, datetime('now')), updated_at = datetime('now') WHERE id = ?",
          [ko.id]
        );
      }

      // 3. Restore stock for pending sales (paid sales have already deducted stock)
      if (sale.status === 'pending') {
        const saleItems = await all('SELECT * FROM sale_items WHERE sale_id = ?', [saleId]);
        for (const item of saleItems) {
          await run('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
      }

      // 4. Free the table if one was assigned
      if (sale.table_id) {
        await run("UPDATE restaurant_tables SET status = 'available' WHERE id = ?", [sale.table_id]);
      }
    });

    return { success: true };
  });

  // ── Hold Order ─────────────────────────────────────────────────────
  ipcMainInstance.handle('hold-order', async (event, order) => {
    const { items, table_id, table_number, total, subtotal, tax, discount, discount_percentage, customer_id, notes } = order;
    return databaseManager.runQuery(
      `INSERT INTO held_orders (items, table_id, table_number, total, subtotal, tax, discount, discount_percentage, customer_id, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        JSON.stringify(items || []),
        table_id || null,
        table_number || null,
        total || 0,
        subtotal || 0,
        tax || 0,
        discount || 0,
        discount_percentage || 0,
        customer_id || null,
        notes || ''
      ]
    );
  });

  // ── Get Held Orders ────────────────────────────────────────────────
  ipcMainInstance.handle('get-held-orders', async () => {
    const rows = await databaseManager.getData(
      'SELECT * FROM held_orders ORDER BY created_at DESC'
    );
    return (rows || []).map(row => ({
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    }));
  });

  // ── Delete Held Order ──────────────────────────────────────────────
  ipcMainInstance.handle('delete-held-order', async (event, id) => {
    return databaseManager.runQuery('DELETE FROM held_orders WHERE id = ?', [id]);
  });

  // ── Restore Held Order ─────────────────────────────────────────────
  ipcMainInstance.handle('restore-held-order', async (event, id) => {
    const row = await databaseManager.getRow('SELECT * FROM held_orders WHERE id = ?', [id]);
    if (!row) return null;
    // Delete after restore to prevent ghost orders / infinite restore loops
    await databaseManager.runQuery('DELETE FROM held_orders WHERE id = ?', [id]);
    return {
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    };
  });

  // ── Get Sales History (paginated, filterable) ──────────────────────
  ipcMainInstance.handle('get-sales-history', async (event, filters = {}) => {
    const { search, date_from, date_to, status, page = 0, limit = 50 } = filters;
    let where = [];
    let params = [];

    if (search) {
      where.push(`(s.receipt_number LIKE ? OR c.name LIKE ? OR s.payment_method LIKE ?)`);
      const q = `%${search}%`;
      params.push(q, q, q);
    }
    if (date_from) { where.push(`DATE(s.created_at) >= DATE(?)`); params.push(date_from); }
    if (date_to) { where.push(`DATE(s.created_at) <= DATE(?)`); params.push(date_to); }
    if (status) { where.push(`s.status = ?`); params.push(status); }

    const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const countRow = await databaseManager.getRow(
      `SELECT COUNT(*) as total FROM sales s LEFT JOIN customers c ON c.id = s.customer_id ${whereClause}`, params
    );

    const sales = await databaseManager.getData(
      `SELECT s.*, u.full_name as user_name, c.name as customer_name
       FROM sales s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN customers c ON c.id = s.customer_id
       ${whereClause}
       ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, page * limit]
    );

    return { sales: sales || [], total: countRow?.total || 0 };
  });

  // ── Get Sale Items ────────────────────────────────────────────────
  ipcMainInstance.handle('get-sale-items', async (event, saleId) => {
    const items = await databaseManager.getData(
      `SELECT si.*, p.name as product_name FROM sale_items si
       LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?`, [saleId]
    );
    return items || [];
  });

  // ── Complete Pending Sale ─────────────────────────────────────────
  ipcMainInstance.handle('complete-pending-sale', async (event, data) => {
    const { sale_id, payment_method } = data;
    const sale = await databaseManager.getRow('SELECT * FROM sales WHERE id = ?', [sale_id]);
    if (!sale) throw new Error('Sale not found');
    if (sale.status !== 'pending') throw new Error('Sale is not pending');

    await databaseManager.runTransaction(async ({ run, get, all }) => {
      // 1. Mark sale as paid
      await run("UPDATE sales SET status = 'paid', kitchen_status = 'pending', payment_method = ?, updated_at = datetime('now') WHERE id = ?", [payment_method, sale_id]);

      // 2. Fetch sale items (needed for stock + kitchen)
      const saleItems = await all('SELECT si.*, p.name as product_name, p.requires_kitchen, p.preparation_department, p.preparation_time FROM sale_items si LEFT JOIN products p ON si.product_id = p.id WHERE si.sale_id = ?', [sale_id]);

      // 3. Deduct stock + record movements (atomic)
      const userRow = await get('SELECT full_name FROM users WHERE id = ?', [sale.user_id]);
      const userName = userRow?.full_name || `User #${sale.user_id}`;

      for (const item of saleItems) {
        const productId = item.product_id;
        const productName = item.product_name || `Product #${productId}`;
        const qty = item.quantity;

        const stockBefore = (await get('SELECT stock FROM products WHERE id = ?', [productId]))?.stock || 0;
        await run('UPDATE products SET stock = stock - ? WHERE id = ?', [qty, productId]);
        const stockAfter = stockBefore - qty;

        await run(
          `INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, reference, user_name)
           VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?)`,
          [productId, productName, qty, stockBefore, stockAfter, `Vente #${sale_id} (complétée)`, `SALE-${sale_id}`, userName]
        );
      }

      // 4. Update shift totals
      const activeShift = await get(
        `SELECT id FROM shifts WHERE status = 'open' AND user_id = ? ORDER BY opened_at DESC LIMIT 1`,
        [sale.user_id]
      );
      if (activeShift) {
        const payMethod = (payment_method || 'cash').toLowerCase();
        let cashInc = 0, cardInc = 0, otherInc = 0;
        if (payMethod === 'cash' || payMethod === 'espèces' || payMethod === 'especes') cashInc = sale.total;
        else if (payMethod === 'card' || payMethod === 'carte') cardInc = sale.total;
        else otherInc = sale.total;
        await run('UPDATE shifts SET cash_sales = COALESCE(cash_sales,0)+?, card_sales = COALESCE(card_sales,0)+?, other_sales = COALESCE(other_sales,0)+? WHERE id = ?',
          [cashInc, cardInc, otherInc, activeShift.id]);
      }

      // 5. Update customer stats
      if (sale.customer_id) {
        await run(`UPDATE customers SET visit_count = visit_count + 1, total_spent = total_spent + ?, loyalty_points = loyalty_points + ?, last_visit_date = datetime('now'), updated_at = datetime('now') WHERE id = ?`,
          [sale.total, Math.floor(sale.total), sale.customer_id]);
      }

      // 6. Create kitchen orders by department (this is the ONLY place for pending→paid)
      {
        const tableNumber = sale.table_id
          ? ((await get('SELECT table_number FROM restaurant_tables WHERE id = ?', [sale.table_id]))?.table_number || String(sale.table_id))
          : 'Comptoir';
        const serverName = userName;

        const departmentGroups = {};
        let maxPrepTime = null;

        for (const item of saleItems) {
          const isKitchen = item.requires_kitchen === 1 || item.requires_kitchen === true;
          if (!isKitchen) continue;

          const dept = item.preparation_department || 'Cuisine';
          if (!departmentGroups[dept]) departmentGroups[dept] = [];
          departmentGroups[dept].push({
            id: item.product_id,
            name: item.product_name,
            product_name: item.product_name,
            quantity: item.quantity,
            price: item.price,
            preparation_time: item.preparation_time || null
          });

          if (item.preparation_time) {
            maxPrepTime = maxPrepTime ? Math.max(maxPrepTime, item.preparation_time) : item.preparation_time;
          }
        }

        for (const [department, deptItems] of Object.entries(departmentGroups)) {
          try {
            await createKitchenOrder(databaseManager, {
              table_number: tableNumber,
              items: deptItems,
              notes: sale.notes || '',
              priority: 'normal',
              sale_id: sale_id,
              total: deptItems.reduce((sum, i) => sum + (i.price * i.quantity), 0),
              server_name: serverName,
              customer_name: '',
              department,
              estimated_minutes: maxPrepTime,
            });
            console.log(`[complete-pending-sale] Kitchen order created for dept "${department}" — sale #${sale_id}`);
          } catch (kitchenErr) {
            console.error(`[complete-pending-sale] Failed kitchen order for dept "${department}":`, kitchenErr.message);
          }
        }
      }
    });

    return { success: true };
  });
}

module.exports = { registerSalesHandlers };
