/**
 * IPC Reports Handlers — Dedicated report endpoints.
 * No raw SQL from renderer. All queries are server-side and parameterized.
 */

const { ipcMain } = require('electron');

function registerReportsHandlers(ipcMainInstance, databaseManager) {
  function getDb() { return databaseManager.getDatabase(); }

  function all(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || []));
    });
  }

  function get(sql, params = []) {
    return new Promise((resolve, reject) => {
      getDb().get(sql, params, (err, row) => err ? reject(err) : resolve(row || null));
    });
  }

  // ── Date helpers ────────────────────────────────────────────────
  function dateRange(period, customStart, customEnd) {
    const now = new Date();
    let start, end;
    switch (period) {
      case 'today':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = now;
        break;
      case 'yesterday':
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'this_week': {
        const day = now.getDay() || 7;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        end = now;
        break;
      }
      case 'last_week': {
        const day = now.getDay() || 7;
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day - 6);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1);
        break;
      }
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
        break;
      case 'last_month':
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case 'this_year':
        start = new Date(now.getFullYear(), 0, 1);
        end = now;
        break;
      case 'last_year':
        start = new Date(now.getFullYear() - 1, 0, 1);
        end = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case 'custom':
        start = customStart ? new Date(customStart) : new Date(now.getFullYear(), now.getMonth(), 1);
        end = customEnd ? new Date(customEnd) : now;
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = now;
    }
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start: fmt(start), end: fmt(end), startFull: start.toISOString(), endFull: end.toISOString() };
  }

  function prevRange(range) {
    const s = new Date(range.start);
    const e = new Date(range.end);
    const days = Math.round((e - s) / 86400000) + 1;
    const ps = new Date(s);
    ps.setDate(ps.getDate() - days);
    const pe = new Date(s);
    pe.setDate(pe.getDate() - 1);
    const fmt = (d) => d.toISOString().slice(0, 10);
    return { start: fmt(ps), end: fmt(pe) };
  }

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Dashboard Summary
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:dashboard', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const pr = prevRange(r);

      const current = await get(
        `SELECT COUNT(*) as totalSales, COALESCE(SUM(total),0) as totalRevenue,
                COALESCE(AVG(total),0) as avgSale, COUNT(DISTINCT customer_id) as uniqueCustomers
         FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?`,
        [r.start, r.end]
      );

      const previous = await get(
        `SELECT COUNT(*) as totalSales, COALESCE(SUM(total),0) as totalRevenue,
                COALESCE(AVG(total),0) as avgSale, COUNT(DISTINCT customer_id) as uniqueCustomers
         FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?`,
        [pr.start, pr.end]
      );

      const repeatRow = await get(
        `SELECT COUNT(*) as repeatCustomers FROM (
           SELECT customer_id, COUNT(*) as vc FROM sales
           WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
             AND customer_id IS NOT NULL
           GROUP BY customer_id HAVING vc > 1
         )`, [r.start, r.end]
      );

      const prevRepeatRow = await get(
        `SELECT COUNT(*) as repeatCustomers FROM (
           SELECT customer_id, COUNT(*) as vc FROM sales
           WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
             AND customer_id IS NOT NULL
           GROUP BY customer_id HAVING vc > 1
         )`, [pr.start, pr.end]
      );

      return {
        current: { ...current, repeatCustomers: repeatRow?.repeatCustomers || 0 },
        previous: { ...previous, repeatCustomers: prevRepeatRow?.repeatCustomers || 0 },
        dateRange: r,
      };
    } catch (error) {
      console.error('❌ report:dashboard error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Sales by Hour / Day
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:sales-by-period', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const isSingleDay = r.start === r.end;

      let rows;
      if (isSingleDay) {
        rows = await all(
          `SELECT strftime('%H', created_at,'localtime') as label,
                  COUNT(*) as sales, COALESCE(SUM(total),0) as revenue
           FROM sales WHERE DATE(created_at,'localtime') = ?
           GROUP BY label ORDER BY label`,
          [r.start]
        );
      } else {
        rows = await all(
          `SELECT DATE(created_at,'localtime') as label,
                  COUNT(*) as sales, COALESCE(SUM(total),0) as revenue
           FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
           GROUP BY label ORDER BY label`,
          [r.start, r.end]
        );
      }

      return { data: rows, dateRange: r, isSingleDay };
    } catch (error) {
      console.error('❌ report:sales-by-period error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Category / Family Performance
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:categories', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const rows = await all(
        `SELECT COALESCE(NULLIF(p.family,''), p.category, 'Sans catégorie') as name,
                COUNT(si.id) as count,
                COALESCE(SUM(si.quantity),0) as totalQuantity,
                COALESCE(SUM(si.price * si.quantity),0) as totalRevenue
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales s ON si.sale_id = s.id
         WHERE DATE(s.created_at,'localtime') >= ? AND DATE(s.created_at,'localtime') <= ?
         GROUP BY name ORDER BY totalRevenue DESC`,
        [r.start, r.end]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:categories error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Top Products
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:top-products', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const limit = opts.limit || 10;
      const rows = await all(
        `SELECT p.id, p.name, p.category, p.family,
                COUNT(si.id) as salesCount,
                COALESCE(SUM(si.quantity),0) as totalQuantity,
                COALESCE(SUM(si.price * si.quantity),0) as totalRevenue
         FROM sale_items si
         JOIN products p ON si.product_id = p.id
         JOIN sales s ON si.sale_id = s.id
         WHERE DATE(s.created_at,'localtime') >= ? AND DATE(s.created_at,'localtime') <= ?
         GROUP BY p.id ORDER BY totalRevenue DESC LIMIT ?`,
        [r.start, r.end, limit]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:top-products error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Transaction History (server-side paginated + filtered)
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:transactions', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const page = Math.max(1, opts.page || 1);
      const perPage = Math.min(100, Math.max(1, opts.perPage || 25));
      const search = opts.search || '';
      const paymentMethod = opts.paymentMethod || '';
      const sortBy = ['created_at', 'total', 'payment_method'].includes(opts.sortBy) ? opts.sortBy : 'created_at';
      const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC';

      let where = `WHERE DATE(s.created_at,'localtime') >= ? AND DATE(s.created_at,'localtime') <= ?`;
      const params = [r.start, r.end];

      if (search) {
        where += ` AND (s.id LIKE ? OR u.full_name LIKE ? OR c.name LIKE ? OR s.notes LIKE ?)`;
        const q = `%${search}%`;
        params.push(q, q, q, q);
      }
      if (paymentMethod) {
        where += ` AND s.payment_method = ?`;
        params.push(paymentMethod);
      }

      const countRow = await get(
        `SELECT COUNT(*) as total FROM sales s
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN customers c ON c.id = s.customer_id
         ${where}`, params
      );
      const total = countRow?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / perPage));

      const transactions = await all(
        `SELECT s.id, s.total, s.tax, s.discount, s.subtotal, s.payment_method,
                s.created_at, s.notes, s.table_id, s.customer_id, s.user_id,
                u.full_name as cashier_name,
                c.name as customer_name,
                rt.table_number
         FROM sales s
         LEFT JOIN users u ON u.id = s.user_id
         LEFT JOIN customers c ON c.id = s.customer_id
         LEFT JOIN restaurant_tables rt ON rt.id = s.table_id
         ${where}
         ORDER BY s.${sortBy} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, perPage, (page - 1) * perPage]
      );

      // Batch-load line items for all transactions in ONE query
      let items = [];
      if (transactions.length > 0) {
        const ids = transactions.map(t => t.id);
        const placeholders = ids.map(() => '?').join(',');
        items = await all(
          `SELECT si.sale_id, si.quantity, si.price, si.vat_rate, si.vat_amount,
                  p.name as product_name, p.category, p.family
           FROM sale_items si
           LEFT JOIN products p ON p.id = si.product_id
           WHERE si.sale_id IN (${placeholders})`,
          ids
        );
      }

      // Group items by sale_id
      const itemsBySale = {};
      for (const item of items) {
        if (!itemsBySale[item.sale_id]) itemsBySale[item.sale_id] = [];
        itemsBySale[item.sale_id].push(item);
      }

      const result = transactions.map(t => {
        const dt = t.created_at ? new Date(t.created_at) : null;
        return {
          ...t,
          date: dt ? dt.toLocaleDateString('fr-FR') : '',
          time: dt ? dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
          cashier: t.cashier_name || '',
          customer: t.customer_name || '',
          paymentMethod: t.payment_method || '',
          receiptNumber: t.receipt_number || null,
          items: itemsBySale[t.id] || [],
        };
      });

      return { data: result, total, totalPages, page, perPage, dateRange: r };
    } catch (error) {
      console.error('❌ report:transactions error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Payment Method Distribution
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:payment-methods', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const rows = await all(
        `SELECT payment_method as method, COUNT(*) as count,
                COALESCE(SUM(total),0) as revenue
         FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
         GROUP BY payment_method ORDER BY revenue DESC`,
        [r.start, r.end]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:payment-methods error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Cash Shifts (paginated + filtered)
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:cash-shifts', async (_event, opts = {}) => {
    try {
      const page = Math.max(1, opts.page || 1);
      const perPage = Math.min(100, Math.max(1, opts.perPage || 20));
      const search = opts.search || '';
      const status = opts.status || '';
      const sortBy = ['opened_at', 'closed_at', 'user_name', 'status', 'closing_actual'].includes(opts.sortBy) ? opts.sortBy : 'opened_at';
      const sortDir = opts.sortDir === 'asc' ? 'ASC' : 'DESC';

      let where = 'WHERE 1=1';
      const params = [];

      if (opts.start) { where += ` AND DATE(sh.opened_at,'localtime') >= ?`; params.push(opts.start); }
      if (opts.end) { where += ` AND DATE(sh.opened_at,'localtime') <= ?`; params.push(opts.end); }
      if (search) {
        where += ` AND (sh.user_name LIKE ? OR sh.note LIKE ?)`;
        params.push(`%${search}%`, `%${search}%`);
      }
      if (status) { where += ` AND sh.status = ?`; params.push(status); }

      const countRow = await get(`SELECT COUNT(*) as total FROM shifts sh ${where}`, params);
      const total = countRow?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / perPage));

      const rows = await all(
        `SELECT sh.id, sh.user_id, sh.user_name, sh.opening_float, sh.closing_expected,
                sh.closing_actual, sh.difference, sh.cash_sales, sh.card_sales, sh.other_sales,
                sh.opened_at, sh.closed_at, sh.status, sh.note,
                (SELECT COUNT(*) FROM sales s WHERE s.shift_id = sh.id) as sales_count,
                (SELECT COALESCE(SUM(s.total),0) FROM sales s WHERE s.shift_id = sh.id) as total_sales
         FROM shifts sh ${where}
         ORDER BY sh.${sortBy} ${sortDir}
         LIMIT ? OFFSET ?`,
        [...params, perPage, (page - 1) * perPage]
      );

      return { data: rows, total, totalPages, page, perPage };
    } catch (error) {
      console.error('❌ report:cash-shifts error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Customer Statistics
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:customers', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);

      const totalCustomers = await get(`SELECT COUNT(*) as count FROM customers WHERE is_active = 1`);
      const newCustomers = await get(
        `SELECT COUNT(*) as count FROM customers WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?`,
        [r.start, r.end]
      );
      const topSpenders = await all(
        `SELECT c.id, c.name, c.email, c.visit_count, c.total_spent, c.loyalty_points,
                COUNT(s.id) as periodVisits, COALESCE(SUM(s.total),0) as periodSpent
         FROM customers c
         JOIN sales s ON s.customer_id = c.id
         WHERE DATE(s.created_at,'localtime') >= ? AND DATE(s.created_at,'localtime') <= ?
         GROUP BY c.id ORDER BY periodSpent DESC LIMIT 10`,
        [r.start, r.end]
      );

      const repeatStats = await get(
        `SELECT
           COUNT(DISTINCT customer_id) as totalBuying,
           SUM(CASE WHEN vc > 1 THEN 1 ELSE 0 END) as repeatCount
         FROM (
           SELECT customer_id, COUNT(*) as vc FROM sales
           WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
             AND customer_id IS NOT NULL
           GROUP BY customer_id
         )`, [r.start, r.end]
      );

      return {
        totalCustomers: totalCustomers?.count || 0,
        newCustomers: newCustomers?.count || 0,
        topSpenders,
        repeatRate: repeatStats?.totalBuying > 0
          ? ((repeatStats.repeatCount / repeatStats.totalBuying) * 100).toFixed(1)
          : 0,
        dateRange: r,
      };
    } catch (error) {
      console.error('❌ report:customers error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Sales by Cashier
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:cashiers', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const rows = await all(
        `SELECT u.id, u.full_name, u.username,
                COUNT(s.id) as salesCount, COALESCE(SUM(s.total),0) as totalRevenue,
                COALESCE(AVG(s.total),0) as avgSale
         FROM sales s
         JOIN users u ON u.id = s.user_id
         WHERE DATE(s.created_at,'localtime') >= ? AND DATE(s.created_at,'localtime') <= ?
         GROUP BY u.id ORDER BY totalRevenue DESC`,
        [r.start, r.end]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:cashiers error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Revenue Trends (daily series for sparklines / line charts)
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:revenue-trends', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const rows = await all(
        `SELECT DATE(created_at,'localtime') as date,
                COUNT(*) as sales, COALESCE(SUM(total),0) as revenue,
                COALESCE(AVG(total),0) as avgTicket
         FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
         GROUP BY date ORDER BY date`,
        [r.start, r.end]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:revenue-trends error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // REPORT: Hourly Heatmap (sales count per hour across all days)
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:hourly-heatmap', async (_event, opts = {}) => {
    try {
      const r = dateRange(opts.period, opts.start, opts.end);
      const rows = await all(
        `SELECT strftime('%H', created_at,'localtime') as hour,
                COUNT(*) as sales, COALESCE(SUM(total),0) as revenue
         FROM sales WHERE DATE(created_at,'localtime') >= ? AND DATE(created_at,'localtime') <= ?
         GROUP BY hour ORDER BY hour`,
        [r.start, r.end]
      );
      return { data: rows, dateRange: r };
    } catch (error) {
      console.error('❌ report:hourly-heatmap error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // X REPORT — Read current shift totals WITHOUT resetting
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:x-report', async (_event, opts = {}) => {
    try {
      const shiftId = opts.shift_id || null;
      let shiftInfo = null;
      if (shiftId) {
        shiftInfo = await get('SELECT * FROM shifts WHERE id = ?', [shiftId]);
      } else {
        shiftInfo = await get('SELECT * FROM shifts WHERE status = \'open\' ORDER BY opened_at DESC LIMIT 1');
      }

      if (!shiftInfo) {
        return { error: 'No open shift found', data: null };
      }

      const sid = shiftInfo.id;
      const startDate = shiftInfo.opened_at ? shiftInfo.opened_at.split(' ')[0] : null;

      const totals = await get(
        `SELECT COUNT(*) as totalSales,
                COALESCE(SUM(total),0) as totalRevenue,
                COALESCE(SUM(tax),0) as totalTax,
                COALESCE(SUM(discount),0) as totalDiscounts,
                COUNT(DISTINCT customer_id) as uniqueCustomers
         FROM sales WHERE shift_id = ? AND status != 'pending'`,
        [sid]
      );

      const paymentMethods = await all(
        `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as revenue
         FROM sales WHERE shift_id = ? AND status != 'pending'
         GROUP BY payment_method ORDER BY revenue DESC`,
        [sid]
      );

      const refunds = await get(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales WHERE shift_id = ? AND status = 'refunded'`,
        [sid]
      );

      const itemsSold = await get(
        `SELECT COALESCE(SUM(si.quantity),0) as count
         FROM sale_items si JOIN sales s ON si.sale_id = s.id
         WHERE s.shift_id = ? AND s.status != 'pending'`,
        [sid]
      );

      const topProducts = await all(
        `SELECT p.name, SUM(si.quantity) as qty, SUM(si.price * si.quantity) as revenue
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         JOIN sales s ON s.id = si.sale_id
         WHERE s.shift_id = ? AND s.status != 'pending'
         GROUP BY p.id ORDER BY revenue DESC LIMIT 5`,
        [sid]
      );

      const now = new Date().toISOString();
      const reportData = {
        type: 'X',
        shift: {
          id: shiftInfo.id,
          user_name: shiftInfo.user_name,
          opened_at: shiftInfo.opened_at,
          opening_float: shiftInfo.opening_float || 0
        },
        period: { start: startDate, end: now.split(' ')[0] },
        sales: {
          total: totals?.totalSales || 0,
          revenue: totals?.totalRevenue || 0,
          tax: totals?.totalTax || 0,
          discounts: totals?.totalDiscounts || 0,
          uniqueCustomers: totals?.uniqueCustomers || 0,
          itemsSold: itemsSold?.count || 0
        },
        paymentMethods: paymentMethods || [],
        refunds: { count: refunds?.count || 0, total: refunds?.total || 0 },
        drawer: {
          opening: shiftInfo.opening_float || 0,
          expected: (shiftInfo.opening_float || 0) + (totals?.totalRevenue || 0) - (shiftInfo.card_sales || 0) - (shiftInfo.other_sales || 0),
          cashSales: shiftInfo.cash_sales || 0,
          cardSales: shiftInfo.card_sales || 0,
          otherSales: shiftInfo.other_sales || 0
        },
        topProducts: topProducts || [],
        generatedAt: now
      };

      return { data: reportData };
    } catch (error) {
      console.error('❌ report:x-report error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Z REPORT — End-of-day closing + archive
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:z-report', async (_event, opts = {}) => {
    try {
      const shiftId = opts.shift_id;
      if (!shiftId) throw new Error('shift_id is required for Z report');

      const shift = await get('SELECT * FROM shifts WHERE id = ?', [shiftId]);
      if (!shift) throw new Error('Shift not found');

      const sid = shift.id;

      const totals = await get(
        `SELECT COUNT(*) as totalSales,
                COALESCE(SUM(total),0) as totalRevenue,
                COALESCE(SUM(tax),0) as totalTax,
                COALESCE(SUM(discount),0) as totalDiscounts,
                COUNT(DISTINCT customer_id) as uniqueCustomers
         FROM sales WHERE shift_id = ? AND status != 'pending'`,
        [sid]
      );

      const paymentMethods = await all(
        `SELECT payment_method, COUNT(*) as count, COALESCE(SUM(total),0) as revenue
         FROM sales WHERE shift_id = ? AND status != 'pending'
         GROUP BY payment_method ORDER BY revenue DESC`,
        [sid]
      );

      const refunds = await get(
        `SELECT COUNT(*) as count, COALESCE(SUM(total),0) as total
         FROM sales WHERE shift_id = ? AND status = 'refunded'`,
        [sid]
      );

      const itemsSold = await get(
        `SELECT COALESCE(SUM(si.quantity),0) as count
         FROM sale_items si JOIN sales s ON si.sale_id = s.id
         WHERE s.shift_id = ? AND s.status != 'pending'`,
        [sid]
      );

      const topProducts = await all(
        `SELECT p.name, SUM(si.quantity) as qty, SUM(si.price * si.quantity) as revenue
         FROM sale_items si
         JOIN products p ON p.id = si.product_id
         JOIN sales s ON s.id = si.sale_id
         WHERE s.shift_id = ? AND s.status != 'pending'
         GROUP BY p.id ORDER BY revenue DESC LIMIT 10`,
        [sid]
      );

      const now = new Date();
      const reportNumber = `Z${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${String(sid).padStart(4,'0')}`;

      const closingActual = opts.closing_actual != null ? opts.closing_actual : (shift.closing_actual || 0);
      const closingExpected = (shift.opening_float || 0) + (totals?.totalRevenue || 0) - (shift.card_sales || 0) - (shift.other_sales || 0);

      const zReport = {
        shift_id: sid,
        user_id: shift.user_id,
        user_name: shift.user_name || '',
        report_number: reportNumber,
        period_start: shift.opened_at || now.toISOString(),
        period_end: now.toISOString(),
        total_sales: totals?.totalSales || 0,
        total_revenue: totals?.totalRevenue || 0,
        total_tax: totals?.totalTax || 0,
        total_discounts: totals?.totalDiscounts || 0,
        cash_sales: shift.cash_sales || 0,
        card_sales: shift.card_sales || 0,
        other_sales: shift.other_sales || 0,
        refund_count: refunds?.count || 0,
        refund_total: refunds?.total || 0,
        opening_float: shift.opening_float || 0,
        closing_expected: closingExpected,
        closing_actual: closingActual,
        difference: closingActual - closingExpected,
        transaction_count: totals?.totalSales || 0,
        items_sold: itemsSold?.count || 0,
        payment_methods_json: JSON.stringify(paymentMethods || []),
        products_json: JSON.stringify(topProducts || []),
        notes: opts.notes || ''
      };

      const result = await databaseManager.runTransaction(async ({ run }) => {
        const insertResult = await run(
          `INSERT INTO z_reports (shift_id, user_id, user_name, report_number, period_start, period_end,
            total_sales, total_revenue, total_tax, total_discounts, cash_sales, card_sales, other_sales,
            refund_count, refund_total, opening_float, closing_expected, closing_actual, difference,
            transaction_count, items_sold, payment_methods_json, products_json, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            zReport.shift_id, zReport.user_id, zReport.user_name, zReport.report_number,
            zReport.period_start, zReport.period_end, zReport.total_sales, zReport.total_revenue,
            zReport.total_tax, zReport.total_discounts, zReport.cash_sales, zReport.card_sales,
            zReport.other_sales, zReport.refund_count, zReport.refund_total, zReport.opening_float,
            zReport.closing_expected, zReport.closing_actual, zReport.difference,
            zReport.transaction_count, zReport.items_sold, zReport.payment_methods_json,
            zReport.products_json, zReport.notes
          ]
        );

        await run('UPDATE shifts SET status = \'closed\', closed_at = ? WHERE id = ? AND status = \'open\'',
          [now.toISOString(), sid]);

        return { id: insertResult.lastID, report_number: reportNumber };
      });

      return {
        data: { ...zReport, id: result.id, report_number: result.report_number }
      };
    } catch (error) {
      console.error('❌ report:z-report error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Get Z Report History
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:z-report-history', async (_event, opts = {}) => {
    try {
      const page = Math.max(1, opts.page || 1);
      const perPage = Math.min(100, Math.max(1, opts.perPage || 20));

      let where = 'WHERE 1=1';
      const params = [];
      if (opts.start) { where += ` AND DATE(period_end,'localtime') >= ?`; params.push(opts.start); }
      if (opts.end) { where += ` AND DATE(period_end,'localtime') <= ?`; params.push(opts.end); }
      if (opts.user_id) { where += ` AND user_id = ?`; params.push(opts.user_id); }

      const countRow = await get(`SELECT COUNT(*) as total FROM z_reports ${where}`, params);
      const total = countRow?.total || 0;
      const totalPages = Math.max(1, Math.ceil(total / perPage));

      const rows = await all(
        `SELECT * FROM z_reports ${where} ORDER BY period_end DESC LIMIT ? OFFSET ?`,
        [...params, perPage, (page - 1) * perPage]
      );

      return { data: rows, total, totalPages, page, perPage };
    } catch (error) {
      console.error('❌ report:z-report-history error:', error);
      throw error;
    }
  });

  // ════════════════════════════════════════════════════════════════════
  // Get single Z Report by ID
  // ════════════════════════════════════════════════════════════════════
  ipcMain.handle('report:z-report-detail', async (_event, reportId) => {
    try {
      const row = await get('SELECT * FROM z_reports WHERE id = ?', [reportId]);
      if (!row) throw new Error('Z report not found');
      return { data: row };
    } catch (error) {
      console.error('❌ report:z-report-detail error:', error);
      throw error;
    }
  });

  console.log('✅ Report IPC handlers registered');
}

module.exports = { registerReportsHandlers };
