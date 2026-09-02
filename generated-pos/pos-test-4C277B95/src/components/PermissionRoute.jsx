import React from 'react';
import { Lock } from 'lucide-react';
import { usePermissions } from '../contexts/PermissionsContext';

/**
 * Route guard: blocks the page when the user has no "Lecture" (read) permission
 * for the given module. `module` undefined => always allowed.
 * When the user only has Lecture (no Écriture), the page content is wrapped in a
 * read-only lock that disables every button and editable control.
 */
export default function PermissionRoute({ module, children }) {
  const { loaded, canRead, readOnly } = usePermissions(module);

  if (!module) return children;

  if (!loaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (!canRead) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-6 h-6 text-muted-foreground" />
        </div>
        <h2 className="text-lg font-semibold">Accès non autorisé</h2>
        <p className="text-sm text-muted-foreground mt-1 max-w-sm">
          Vous n'avez pas la permission d'accéder à cette section. Contactez un administrateur.
        </p>
      </div>
    );
  }

  return (
    <div className="readonly-lock" data-readonly={readOnly ? 'true' : 'false'}>
      {children}
    </div>
  );
}
