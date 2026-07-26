/**
 * Customer IPC Handlers — Complete rewrite
 * Handles customer management, statistics, loyalty, and activity
 */

const { ipcMain } = require('electron');

const VALID_STATUSES = ['active', 'inactive', 'vip'];

function validateEmail(email) {
  if (!email || !email.trim()) return null;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim()) ? email.trim() : null;
}

function validatePhone(phone) {
  if (!phone || !phone.trim()) return null;
  const cleaned = phone.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d{7,15}$/.test(cleaned)) return null;
  return phone.trim();
}

function recalculateStats(db, customerId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT COUNT(*) as visit_count,
              COALESCE(SUM(total), 0) as total_spent,
              COALESCE(AVG(total), 0) as average_ticket,
              MAX(created_at) as last_visit_date
       FROM sales WHERE customer_id = ?`,
      [customerId],
      (err, row) => {
        if (err) { reject(err); return; }
        resolve(row || { visit_count: 0, total_spent: 0, average_ticket: 0, last_visit_date: null });
      }
    );
  });
}

function registerCustomerHandlers(ipcMainInstance, databaseManager) {
  const db = databaseManager.getDatabase();
  if (!db) { console.warn('⚠️ Database not available for customer handlers'); return; }

  // ── Get all customers ──────────────────────────────────────────
  ipcMainInstance.handle('get-customers', () => {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, email, phone, address, loyalty_points,
                total_spent, visit_count, last_visit_date,
                notes, tags, is_active, created_at, updated_at
         FROM customers ORDER BY name ASC`,
        [],
        (err, rows) => {
          if (err) { console.error('Error getting customers:', err); reject(err); }
          else { resolve(rows || []); }
        }
      );
    });
  });

  // ── Get single customer ────────────────────────────────────────
  ipcMainInstance.handle('get-customer', async (event, id) => {
    try {
      const row = await new Promise((resolve, reject) => {
        db.get(
          `SELECT id, name, email, phone, address, loyalty_points,
                  total_spent, visit_count, last_visit_date,
                  notes, tags, is_active, created_at, updated_at
           FROM customers WHERE id = ?`,
          [id],
          (err, r) => err ? reject(err) : resolve(r)
        );
      });
      return row || null;
    } catch (error) {
      console.error('Error getting customer:', error);
      return null;
    }
  });

  // ── Add customer ───────────────────────────────────────────────
  ipcMainInstance.handle('add-customer', async (event, customer) => {
    const { name, email, phone, address, loyalty_points, notes, tags } = customer;

    if (!name || !name.trim()) {
      throw new Error('Le nom est obligatoire');
    }

    const cleanEmail = validateEmail(email);
    if (email && !cleanEmail) {
      throw new Error('Format d\'email invalide');
    }

    const cleanPhone = validatePhone(phone);
    if (phone && !cleanPhone) {
      throw new Error('Format de téléphone invalide');
    }

    // Check duplicate email
    if (cleanEmail) {
      const existing = await new Promise((resolve) => {
        db.get('SELECT id FROM customers WHERE email = ?', [cleanEmail], (err, row) => {
          resolve(err ? null : row);
        });
      });
      if (existing) {
        throw new Error('Un client avec cet email existe déjà');
      }
    }

    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO customers (name, email, phone, address, loyalty_points, notes, tags, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
        [
          name.trim(),
          cleanEmail,
          cleanPhone || null,
          address || null,
          loyalty_points || 0,
          notes || '',
          tags || ''
        ],
        function(err) {
          if (err) {
            console.error('Error adding customer:', err);
            reject(err);
          } else {
            console.log('✅ Customer added:', this.lastID, name.trim());
            resolve({ id: this.lastID, success: true });
          }
        }
      );
    });
  });

  // ── Update customer ────────────────────────────────────────────
  ipcMainInstance.handle('update-customer', async (event, id, customer) => {
    const { name, email, phone, address, loyalty_points, notes, tags, is_active } = customer;

    if (!name || !name.trim()) {
      throw new Error('Le nom est obligatoire');
    }

    const cleanEmail = validateEmail(email);
    if (email && !cleanEmail) {
      throw new Error('Format d\'email invalide');
    }

    const cleanPhone = validatePhone(phone);
    if (phone && !cleanPhone) {
      throw new Error('Format de téléphone invalide');
    }

    // Check duplicate email (excluding self)
    if (cleanEmail) {
      const existing = await new Promise((resolve) => {
        db.get('SELECT id FROM customers WHERE email = ? AND id != ?', [cleanEmail, id], (err, row) => {
          resolve(err ? null : row);
        });
      });
      if (existing) {
        throw new Error('Un autre client utilise déjà cet email');
      }
    }

    return new Promise((resolve, reject) => {
      db.run(
        `UPDATE customers SET
          name = ?, email = ?, phone = ?, address = ?,
          loyalty_points = ?, notes = ?, tags = ?,
          is_active = ?, updated_at = datetime('now')
         WHERE id = ?`,
        [
          name.trim(),
          cleanEmail,
          cleanPhone || null,
          address || null,
          loyalty_points || 0,
          notes || '',
          tags || '',
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
          id
        ],
        function(err) {
          if (err) {
            console.error('Error updating customer:', err);
            reject(err);
          } else {
            resolve({ success: true });
          }
        }
      );
    });
  });

  // ── Delete customer (cascade-safe) ─────────────────────────────
  ipcMainInstance.handle('delete-customer', async (event, id) => {
    // Check dependencies
    const salesCount = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as cnt FROM sales WHERE customer_id = ?', [id], (err, r) => {
        resolve(err ? 0 : (r?.cnt || 0));
      });
    });

    if (salesCount > 0) {
      throw new Error(
        `Impossible de supprimer ce client : ${salesCount} vente(s) associée(s). ` +
        `Désactivez-le plutôt que de le supprimer.`
      );
    }

    // Check appointments
    const apptCount = await new Promise((resolve) => {
      db.get('SELECT COUNT(*) as cnt FROM appointments WHERE customer_id = ?', [id], (err, r) => {
        resolve(err ? 0 : (r?.cnt || 0));
      });
    });

    if (apptCount > 0) {
      throw new Error(
        `Impossible de supprimer ce client : ${apptCount} rendez-vous associé(s).`
      );
    }

    return new Promise((resolve, reject) => {
      db.run('DELETE FROM customers WHERE id = ?', [id], function(err) {
        if (err) {
          console.error('Error deleting customer:', err);
          reject(err);
        } else {
          console.log('✅ Customer deleted:', id);
          resolve({ success: true });
        }
      });
    });
  });

  // ── Get customer purchases ─────────────────────────────────────
  ipcMainInstance.handle('get-customer-purchases', async (event, customerId) => {
    try {
      return await new Promise((resolve, reject) => {
        db.all(
          `SELECT s.id, s.subtotal, s.total, s.tax, s.discount, s.payment_method,
                  s.created_at, s.user_id, s.notes,
                  u.full_name as cashier_name,
                  (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) as item_count,
                  (SELECT SUM(si.quantity) FROM sale_items si WHERE si.sale_id = s.id) as total_items
           FROM sales s
           LEFT JOIN users u ON u.id = s.user_id
           WHERE s.customer_id = ?
           ORDER BY s.created_at DESC LIMIT 100`,
          [customerId],
          (err, rows) => {
            if (err) { reject(err); }
            else { resolve(rows || []); }
          }
        );
      });
    } catch (error) {
      console.error('Error getting customer purchases:', error);
      return [];
    }
  });

  // ── Get customer stats (single source of truth: from sales) ───
  ipcMainInstance.handle('get-customer-stats', async (event, customerId) => {
    try {
      const stats = await recalculateStats(db, customerId);

      // Monthly spending (last 6 months)
      const monthlySpending = await new Promise((resolve, reject) => {
        db.all(
          `SELECT strftime('%Y-%m', created_at) as month, SUM(total) as total
           FROM sales WHERE customer_id = ? AND created_at >= datetime('now', '-6 months')
           GROUP BY month ORDER BY month ASC`,
          [customerId],
          (err, rows) => err ? reject(err) : resolve(rows || [])
        );
      });

      // Visit frequency
      const visitFrequency = await new Promise((resolve, reject) => {
        db.get(
          `SELECT
             COUNT(*) as total_visits,
             MIN(created_at) as first_visit,
             MAX(created_at) as last_visit,
             CASE WHEN COUNT(*) > 1
               THEN ROUND(JULIANDAY('now') - JULIANDAY(MIN(created_at))) / COUNT(*)
               ELSE 0
             END as avg_days_between
           FROM sales WHERE customer_id = ?`,
          [customerId],
          (err, row) => err ? reject(err) : resolve(row || { total_visits: 0, avg_days_between: 0 })
        );
      });

      return {
        visit_count: stats.visit_count,
        total_spent: stats.total_spent,
        average_ticket: stats.average_ticket,
        last_visit_date: stats.last_visit_date,
        monthly_spending: monthlySpending,
        visit_frequency: visitFrequency
      };
    } catch (error) {
      console.error('Error getting customer stats:', error);
      return { visit_count: 0, total_spent: 0, average_ticket: 0, last_visit_date: null, monthly_spending: [], visit_frequency: {} };
    }
  });

  // ── Get customer favorite products ─────────────────────────────
  ipcMainInstance.handle('get-customer-favorite-products', async (event, customerId) => {
    try {
      return await new Promise((resolve, reject) => {
        db.all(
          `SELECT p.id, p.name, p.price as current_price,
                  SUM(si.quantity) as total_qty,
                  COUNT(DISTINCT si.sale_id) as times_bought,
                  AVG(si.price) as avg_purchase_price,
                  MIN(si.price) as first_price,
                  MAX(s.created_at) as last_purchased_at
           FROM sale_items si
           JOIN products p ON p.id = si.product_id
           JOIN sales s ON s.id = si.sale_id
           WHERE s.customer_id = ?
           GROUP BY p.id, p.name, p.price
           ORDER BY total_qty DESC LIMIT 10`,
          [customerId],
          (err, rows) => {
            if (err) { reject(err); }
            else { resolve(rows || []); }
          }
        );
      });
    } catch (error) {
      console.error('Error getting favorite products:', error);
      return [];
    }
  });

  // ── Get customer activity timeline ─────────────────────────────
  ipcMainInstance.handle('get-customer-activity', async (event, customerId) => {
    try {
      const activities = await new Promise((resolve, reject) => {
        db.all(
          `SELECT 'purchase' as type, s.id as ref_id, s.total as amount, s.payment_method,
                  s.created_at, s.notes
           FROM sales s WHERE s.customer_id = ?
           UNION ALL
           SELECT 'appointment' as type, a.id as ref_id, a.price as amount, a.service_name,
                  a.created_at, a.notes
           FROM appointments a WHERE a.customer_id = ?
           ORDER BY created_at DESC LIMIT 50`,
          [customerId, customerId],
          (err, rows) => err ? reject(err) : resolve(rows || [])
        );
      });
      return activities;
    } catch (error) {
      console.error('Error getting customer activity:', error);
      return [];
    }
  });

  // ── Detect duplicates ──────────────────────────────────────────
  ipcMainInstance.handle('find-customer-duplicates', async () => {
    try {
      const emailDupes = await new Promise((resolve) => {
        db.all(
          `SELECT email, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
           FROM customers WHERE email IS NOT NULL AND email != ''
           GROUP BY email HAVING cnt > 1`,
          [],
          (err, rows) => err ? resolve([]) : resolve(rows || [])
        );
      });

      const phoneDupes = await new Promise((resolve) => {
        db.all(
          `SELECT phone, GROUP_CONCAT(id) as ids, COUNT(*) as cnt
           FROM customers WHERE phone IS NOT NULL AND phone != ''
           GROUP BY phone HAVING cnt > 1`,
          [],
          (err, rows) => err ? resolve([]) : resolve(rows || [])
        );
      });

      return { email_duplicates: emailDupes, phone_duplicates: phoneDupes };
    } catch (error) {
      console.error('Error finding duplicates:', error);
      return { email_duplicates: [], phone_duplicates: [] };
    }
  });

  // ── Toggle customer active status ──────────────────────────────
  ipcMainInstance.handle('toggle-customer-active', async (event, id) => {
    try {
      return await new Promise((resolve, reject) => {
        db.run(
          `UPDATE customers SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END,
                  updated_at = datetime('now')
           WHERE id = ?`,
          [id],
          function(err) {
            if (err) reject(err);
            else resolve({ success: true });
          }
        );
      });
    } catch (error) {
      console.error('Error toggling customer active:', error);
      throw error;
    }
  });

  console.log('✅ Customer IPC handlers registered');
}

module.exports = { registerCustomerHandlers };
