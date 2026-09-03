import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { canonicalModule, roleDefaults, PERMISSION_PRESETS, isAdminRole } from '../lib/permissions';

const { ALL, NONE } = PERMISSION_PRESETS;

const PermissionsContext = createContext(null);

/**
 * Loads the current user's granular module permissions (user_modules table)
 * once per login and exposes them to the whole app.
 */
export function PermissionsProvider({ children }) {
  const { user } = useAuth();
  const [rows, setRows] = useState(null); // { [canonicalModule]: {read,create,update,delete} } | null
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!user?.id) { setRows(null); setLoaded(true); return; }
    if (isAdminRole(user.role)) { setRows({}); setLoaded(true); return; }
    setLoaded(false);
    try {
      const list = (await window.electronAPI?.getUserModules?.(user.id)) || [];
      const map = {};
      (Array.isArray(list) ? list : []).forEach((m) => {
        const key = canonicalModule(m.module_name);
        const prev = map[key] || { read: false, create: false, update: false, delete: false };
        map[key] = {
          read: prev.read || !!m.can_read,
          create: prev.create || !!m.can_create,
          update: prev.update || !!m.can_update,
          delete: prev.delete || !!m.can_delete,
        };
      });
      setRows(map);
    } catch {
      setRows({});
    } finally {
      setLoaded(true);
    }
  }, [user?.id, user?.role]);

  useEffect(() => { reload(); }, [reload]);

  const value = useMemo(() => {
    const isAdmin = isAdminRole(user?.role);
    const hasConfig = !!rows && Object.keys(rows).length > 0;
    const get = (moduleKey) => {
      if (isAdmin) return ALL;
      if (!user) return NONE;
      const key = canonicalModule(moduleKey);
      // Dashboard access follows the granted permission like any other module;
      // the admin dialog Lecture toggle is therefore meaningful (grant or revoke).
      if (!hasConfig) return roleDefaults(user.role, key); // no rows -> role fallback
      return rows[key] || NONE; // configured -> strict (missing module = no access)
    };
    return { loaded, isAdmin, get, reload };
  }, [rows, loaded, user, reload]);

  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

/**
 * usePermissions('products') -> { canRead, canCreate, canUpdate, canDelete, canManage, readOnly, loaded }
 * Outside a provider (e.g. isolated preview) it fails open so nothing breaks.
 */
export function usePermissions(moduleKey) {
  const ctx = useContext(PermissionsContext);
  const p = ctx ? ctx.get(moduleKey) : ALL;
  return {
    loaded: ctx ? ctx.loaded : true,
    isAdmin: ctx ? ctx.isAdmin : true,
    canRead: p.read,
    canCreate: p.create,
    canUpdate: p.update,
    canDelete: p.delete,
    canManage: p.create || p.update || p.delete,
    readOnly: p.read && !(p.create || p.update || p.delete),
    reload: ctx ? ctx.reload : () => {},
  };
}

export default PermissionsContext;
