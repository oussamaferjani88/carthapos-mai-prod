import React from 'react';
import { Check } from 'lucide-react';

const themes = [
  {
    id: 'modern', name: 'Moderne', description: 'Clean et professionnel', preview: '#3B82F6',
    config: {
      primaryColor: '#3B82F6', secondaryColor: '#1E40AF', accentColor: '#F59E0B',
      backgroundColor: '#FFFFFF', textColor: '#1F2937', cardBackgroundColor: '#F9FAFB',
      cardBorderColor: '#E5E7EB', textMutedColor: '#6B7280', fontFamily: 'Inter',
      borderRadius: 'medium', shadowIntensity: 'medium',
    },
  },
  {
    id: 'dark', name: 'Sombre', description: 'Élégant et moderne', preview: '#1F2937',
    config: {
      primaryColor: '#1F2937', secondaryColor: '#374151', accentColor: '#F59E0B',
      backgroundColor: '#111827', textColor: '#F9FAFB', cardBackgroundColor: '#1F2937',
      cardBorderColor: '#374151', textMutedColor: '#9CA3AF', fontFamily: 'Inter',
      borderRadius: 'medium', shadowIntensity: 'large',
    },
  },
  {
    id: 'warm', name: 'Chaleureux', description: 'Accueillant et convivial', preview: '#F97316',
    config: {
      primaryColor: '#F97316', secondaryColor: '#EA580C', accentColor: '#DC2626',
      backgroundColor: '#FFF7ED', textColor: '#9A3412', cardBackgroundColor: '#FFEDD5',
      cardBorderColor: '#FED7AA', textMutedColor: '#C2410C', fontFamily: 'Poppins',
      borderRadius: 'large', shadowIntensity: 'medium',
    },
  },
  {
    id: 'elegant', name: 'Élégant', description: 'Raffiné et sophistiqué', preview: '#8B5CF6',
    config: {
      primaryColor: '#8B5CF6', secondaryColor: '#7C3AED', accentColor: '#EC4899',
      backgroundColor: '#FAFAFF', textColor: '#374151', cardBackgroundColor: '#F8FAFC',
      cardBorderColor: '#E2E8F0', textMutedColor: '#64748B', fontFamily: 'Poppins',
      borderRadius: 'large', shadowIntensity: 'medium',
    },
  },
  {
    id: 'nature', name: 'Nature', description: 'Frais et naturel', preview: '#059669',
    config: {
      primaryColor: '#059669', secondaryColor: '#047857', accentColor: '#10B981',
      backgroundColor: '#F0FDF4', textColor: '#065F46', cardBackgroundColor: '#ECFDF5',
      cardBorderColor: '#D1FAE5', textMutedColor: '#047857', fontFamily: 'Inter',
      borderRadius: 'medium', shadowIntensity: 'medium',
    },
  },
  {
    id: 'minimal', name: 'Minimal', description: 'Simple et épuré', preview: '#6B7280',
    config: {
      primaryColor: '#6B7280', secondaryColor: '#4B5563', accentColor: '#3B82F6',
      backgroundColor: '#FFFFFF', textColor: '#111827', cardBackgroundColor: '#FFFFFF',
      cardBorderColor: '#F3F4F6', textMutedColor: '#6B7280', fontFamily: 'Inter',
      borderRadius: 'small', shadowIntensity: 'none',
    },
  },
];

const ThemeSelector = ({ formData, setFormData }) => {
  const currentTheme = formData?.configuration?.themeId || null;

  const applyTheme = (theme) => {
    setFormData({
      ...formData,
      configuration: {
        ...formData.configuration,
        ...theme.config,
        themeId: theme.id,
        // Keep the Layout panel's card-radius control in sync with the
        // theme's own radius, since they'd otherwise silently disagree.
        components: {
          ...formData.configuration?.components,
          cards: { ...formData.configuration?.components?.cards, borderRadius: theme.config.borderRadius },
        },
      },
    });
  };

  return (
    <div className="space-y-1.5">
      {themes.map((theme) => {
        const isSelected = currentTheme === theme.id;
        return (
          <button
            key={theme.id}
            onClick={() => applyTheme(theme)}
            className={`
              w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md border text-left transition-colors
              ${isSelected
                ? 'border-blue-300 bg-blue-50/60'
                : 'border-border bg-white hover:bg-accent/60 hover:border-blue-200'
              }
            `}
          >
            <span
              className="w-5 h-5 rounded border border-black/5 shadow-sm shrink-0"
              style={{ backgroundColor: theme.preview }}
            />
            <span className="flex-1 min-w-0">
              <span className={`block text-[13px] leading-tight ${isSelected ? 'text-blue-900 font-medium' : 'font-medium'}`}>
                {theme.name}
              </span>
              <span className="block text-[11px] text-muted-foreground leading-tight truncate">
                {theme.description}
              </span>
            </span>
            {isSelected && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-blue-600 shrink-0">
                <Check className="w-3 h-3 text-white" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ThemeSelector;
