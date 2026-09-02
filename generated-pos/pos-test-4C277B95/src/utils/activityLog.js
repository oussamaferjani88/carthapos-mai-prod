const log = async ({ userId, userName, actionType, entityType, entityId, oldValue, newValue, notes }) => {
  try {
    if (!window.electronAPI?.logAuditEvent) return;
    await window.electronAPI.logAuditEvent({
      user_id: userId || 0,
      user_name: userName || 'System',
      action_type: actionType,
      entity_type: entityType || null,
      entity_id: entityId || null,
      old_value: oldValue || null,
      new_value: newValue || null,
      notes: notes || null,
    });
  } catch (e) {
    console.error('Activity log error:', e);
  }
};

const getLogs = async (filters = {}) => {
  try {
    if (!window.electronAPI?.getAuditLogs) return [];
    return await window.electronAPI.getAuditLogs(filters) || [];
  } catch (e) {
    console.error('Get logs error:', e);
    return [];
  }
};

export const activityLog = { log, getLogs };
