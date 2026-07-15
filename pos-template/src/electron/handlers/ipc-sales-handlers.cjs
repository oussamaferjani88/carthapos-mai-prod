/**
 * Sales IPC Handlers
 * Atomic transactions, full metadata persistence, kitchen orders, hold/recall
 */

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
      payment_method, customer_id, user_id, table_id, notes
    } = sale;

    if (!items || items.length === 0) {
      throw new Error('Sale must contain at least one item');
    }
    if (!user_id) {
      throw new Error('user_id is required');
    }

    return databaseManager.runTransaction(async ({ run, get, all }) => {
      // 0. Find active shift to link sale to it
      const activeShift = await get(
        `SELECT id, cash_sales, card_sales, other_sales FROM shifts
         WHERE status = 'open' AND user_id = ? ORDER BY opened_at DESC LIMIT 1`,
        [user_id]
      );

      // 1. Insert sale header (with shift_id if shift is active)
      const saleResult = await run(
        `INSERT INTO sales (subtotal, total, tax, discount, payment_method, customer_id, user_id, table_id, notes, shift_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subtotal || 0,
          total || 0,
          tax || 0,
          discount || 0,
          payment_method || 'cash',
          customer_id || null,
          user_id,
          table_id || null,
          notes || '',
          activeShift ? activeShift.id : null
        ]
      );
      const saleId = saleResult.lastID;

      // 2. Insert sale items + record inventory movements
      const userRow = await get('SELECT full_name FROM users WHERE id = ?', [user_id]);
      const userName = userRow?.full_name || `User #${user_id}`;

      for (const item of items) {
        await run(
          `INSERT INTO sale_items (sale_id, product_id, quantity, price) VALUES (?, ?, ?, ?)`,
          [saleId, item.id, item.quantity, item.price]
        );

        // 3. Decrement inventory & record movement
        const beforeRow = await get('SELECT stock FROM products WHERE id = ?', [item.id]);
        const stockBefore = beforeRow?.stock || 0;
        const stockAfter = Math.max(0, stockBefore - item.quantity);

        await run(
          'UPDATE products SET stock = ? WHERE id = ?',
          [stockAfter, item.id]
        );

        await run(
           `INSERT INTO stock_movements (product_id, product_name, movement_type, quantity, stock_before, stock_after, reason, reference, user_name)
            VALUES (?, ?, 'sale', ?, ?, ?, ?, ?, ?)`,
          [item.id, item.name || `Product #${item.id}`, item.quantity, stockBefore, stockAfter,
           `Vente #${saleId}`, `SALE-${saleId}`, userName]
        );
      }

      // 4. Free the table if one was assigned
      if (table_id) {
        await run(
          'UPDATE restaurant_tables SET status = ? WHERE id = ?',
          ['available', table_id]
        );
      }

      // 5. Update customer stats if customer_id provided
      if (customer_id) {
        const custRow = await get(
          'SELECT visit_count, total_spent FROM customers WHERE id = ?',
          [customer_id]
        );

        if (custRow) {
          const prevVisits = custRow.visit_count || 0;
          const prevSpent  = custRow.total_spent || 0;
          await run(
            `UPDATE customers SET
              visit_count = ?,
              total_spent = ?,
              last_visit_date = datetime('now')
             WHERE id = ?`,
            [prevVisits + 1, prevSpent + (total || 0), customer_id]
          );
        }
      }

      // 6. Update active shift totals
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

      // 7. Create kitchen order if this is a restaurant sale (table assigned)
      if (table_id) {
        const kitchenItems = items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price
        }));

        const tableInfo = await get(
          'SELECT table_number FROM restaurant_tables WHERE id = ?', [table_id]
        );

        await run(
          `INSERT INTO kitchen_orders (table_number, items, notes, priority, status, sale_id, total, created_at, updated_at)
           VALUES (?, ?, ?, 'normal', 'pending', ?, ?, datetime('now'), datetime('now'))`,
          [
            tableInfo ? tableInfo.table_number : String(table_id),
            JSON.stringify(kitchenItems),
            notes || '',
            saleId,
            total || 0
          ]
        );

        console.log(`🍳 Kitchen order created for sale #${saleId}`);
      }

      console.log(`✅ Sale #${saleId} completed (atomic, user=${user_id})`);
      return { id: saleId };
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
    return {
      ...row,
      items: typeof row.items === 'string' ? JSON.parse(row.items) : (row.items || [])
    };
  });
}

module.exports = { registerSalesHandlers };
