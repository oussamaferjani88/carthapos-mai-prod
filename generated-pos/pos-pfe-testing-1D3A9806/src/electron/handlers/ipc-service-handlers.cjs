/**
 * Service & Appointment IPC Handlers
 * Handles appointments and services for service-based businesses
 */

const { ipcMain } = require('electron');

function registerServiceHandlers(ipcMainInstance, databaseManager) {
  console.log('📅 Registering service & appointment IPC handlers...');

  const db = databaseManager.getDatabase();
  if (!db) { console.warn('⚠️ Database not available for service handlers'); return; }

  // Appointments
  ipcMainInstance.handle('get-appointments', (event, date = null) => {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM appointments';
      let params = [];
      
      if (date) {
        query += ' WHERE DATE(appointment_date) = DATE(?)';
        params.push(date);
      }
      
      query += ' ORDER BY appointment_date ASC';
      
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Error getting appointments:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  });

  ipcMainInstance.handle('add-appointment', (event, appointment) => {
    return new Promise((resolve, reject) => {
      const { customerId, customerName, customerPhone, serviceId, appointmentDate, notes, status } = appointment;

      db.run(
        `INSERT INTO appointments (customer_id, customer_name, customer_phone, service_id, appointment_date, notes, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [customerId || null, customerName || '', customerPhone || '', serviceId || null, appointmentDate, notes || '', status || 'scheduled'],
        function(err) {
          if (err) {
            console.error('Error adding appointment:', err);
            reject(err);
          } else {
            console.log('✅ Appointment added successfully with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMainInstance.handle('update-appointment-status', (event, id, status) => {
    return new Promise((resolve, reject) => {
      db.run(
        'UPDATE appointments SET status = ? WHERE id = ?',
        [status, id],
        function(err) {
          if (err) {
            console.error('Error updating appointment status:', err);
            reject(err);
          } else {
            console.log('✅ Appointment status updated');
            resolve({ success: true });
          }
        }
      );
    });
  });

  // Services
  ipcMainInstance.handle('get-services', () => {
    return new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM services ORDER BY name',
        [],
        (err, rows) => {
          if (err) {
            console.error('Error getting services:', err);
            reject(err);
          } else {
            resolve(rows || []);
          }
        }
      );
    });
  });

  ipcMainInstance.handle('add-service', (event, service) => {
    return new Promise((resolve, reject) => {
      const { name, description, price, duration } = service;
      
      db.run(
        `INSERT INTO services (name, description, price, duration)
         VALUES (?, ?, ?, ?)`,
        [name, description || '', price, duration || 30],
        function(err) {
          if (err) {
            console.error('Error adding service:', err);
            reject(err);
          } else {
            console.log('✅ Service added successfully with ID:', this.lastID);
            resolve({ id: this.lastID });
          }
        }
      );
    });
  });

  ipcMainInstance.handle('delete-service', (event, id) => {
    return new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM services WHERE id = ?',
        [id],
        function(err) {
          if (err) {
            console.error('Error deleting service:', err);
            reject(err);
          } else {
            console.log('✅ Service deleted successfully');
            resolve({ success: true });
          }
        }
      );
    });
  });
}

module.exports = { registerServiceHandlers };
