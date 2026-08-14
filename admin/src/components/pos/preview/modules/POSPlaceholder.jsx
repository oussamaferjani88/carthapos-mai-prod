import React from 'react';
import { FolderOpen, Sparkles } from 'lucide-react';

// Placeholder professionnel pour les modules du POS réel qui n'ont pas encore
// d'implémentation d'aperçu. Suit le design system du POS réel (coquille +
// en-tête de page + état vide) pour que l'aperçu reste cohérent.
export const POSPlaceholder = ({ config, placeholder = {} }) => {
  const textColor = config?.textColor || '#1f2937';
  const mutedColor = config?.textMutedColor || '#6b7280';
  const borderColor = config?.cardBorderColor || '#e5e7eb';
  const primaryColor = config?.primaryColor || '#3b82f6';

  const { label = 'Module', description = '', icon: Icon } = placeholder;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: primaryColor + '1a' }}
          >
            {Icon ? <Icon className="h-6 w-6" style={{ color: primaryColor }} /> : <FolderOpen className="h-6 w-6" style={{ color: primaryColor }} />}
          </div>
          <div>
            <h1 className="text-xl font-bold" style={{ color: textColor }}>
              {label}
            </h1>
            <p className="text-sm" style={{ color: mutedColor }}>
              {description || 'Gérez cette fonctionnalité depuis votre POS'}
            </p>
          </div>
        </div>
      </div>

      {/* Empty state */}
      <div
        className="rounded-xl border"
        style={{ borderColor, backgroundColor: '#fff' }}
      >
        <div className="py-12 px-6 flex flex-col items-center text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: '#f3f4f6' }}
          >
            {Icon ? <Icon className="h-8 w-8" style={{ color: mutedColor }} /> : <FolderOpen className="h-8 w-8" style={{ color: mutedColor }} />}
          </div>
          <h3 className="font-semibold" style={{ color: textColor }}>
            Module {label}
          </h3>
          <p className="text-sm mt-1 max-w-sm" style={{ color: mutedColor }}>
            Ce module est livré dans le POS complet. Son aperçu détaillé
            apparaîtra dans l'application générée.
          </p>
          <div className="flex items-center gap-1.5 mt-4 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: primaryColor + '14', color: primaryColor }}>
            <Sparkles className="h-3.5 w-3.5" />
            Disponible dans la version complète
          </div>
        </div>
      </div>
    </div>
  );
};

export default POSPlaceholder;
