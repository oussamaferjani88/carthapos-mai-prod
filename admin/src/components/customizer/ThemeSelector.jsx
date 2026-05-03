import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Palette, Check } from 'lucide-react';

const ThemeSelector = ({ formData, setFormData }) => {
  const themes = [
    {
      id: 'modern',
      name: 'Moderne',
      description: 'Clean et professionnel',
      preview: '#3B82F6',
      config: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1E40AF',
        accentColor: '#F59E0B',
        backgroundColor: '#FFFFFF',
        textColor: '#1F2937',
        cardBackgroundColor: '#F9FAFB',
        cardBorderColor: '#E5E7EB',
        textMutedColor: '#6B7280',
        fontFamily: 'Inter',
        borderRadius: 'medium',
        shadowIntensity: 'medium'
      }
    },
    {
      id: 'dark',
      name: 'Sombre',
      description: 'Élégant et moderne',
      preview: '#1F2937',
      config: {
        primaryColor: '#1F2937',
        secondaryColor: '#374151',
        accentColor: '#F59E0B',
        backgroundColor: '#111827',
        textColor: '#F9FAFB',
        cardBackgroundColor: '#1F2937',
        cardBorderColor: '#374151',
        textMutedColor: '#9CA3AF',
        fontFamily: 'Inter',
        borderRadius: 'medium',
        shadowIntensity: 'large'
      }
    },
    {
      id: 'warm',
      name: 'Chaleureux',
      description: 'Accueillant et convivial',
      preview: '#F97316',
      config: {
        primaryColor: '#F97316',
        secondaryColor: '#EA580C',
        accentColor: '#DC2626',
        backgroundColor: '#FFF7ED',
        textColor: '#9A3412',
        cardBackgroundColor: '#FFEDD5',
        cardBorderColor: '#FED7AA',
        textMutedColor: '#C2410C',
        fontFamily: 'Poppins',
        borderRadius: 'large',
        shadowIntensity: 'medium'
      }
    },
    {
      id: 'elegant',
      name: 'Élégant',
      description: 'Raffiné et sophistiqué',
      preview: '#8B5CF6',
      config: {
        primaryColor: '#8B5CF6',
        secondaryColor: '#7C3AED',
        accentColor: '#EC4899',
        backgroundColor: '#FAFAFF',
        textColor: '#374151',
        cardBackgroundColor: '#F8FAFC',
        cardBorderColor: '#E2E8F0',
        textMutedColor: '#64748B',
        fontFamily: 'Poppins',
        borderRadius: 'large',
        shadowIntensity: 'medium'
      }
    },
    {
      id: 'nature',
      name: 'Nature',
      description: 'Frais et naturel',
      preview: '#059669',
      config: {
        primaryColor: '#059669',
        secondaryColor: '#047857',
        accentColor: '#10B981',
        backgroundColor: '#F0FDF4',
        textColor: '#065F46',
        cardBackgroundColor: '#ECFDF5',
        cardBorderColor: '#D1FAE5',
        textMutedColor: '#047857',
        fontFamily: 'Inter',
        borderRadius: 'medium',
        shadowIntensity: 'medium'
      }
    },
    {
      id: 'minimal',
      name: 'Minimal',
      description: 'Simple et épuré',
      preview: '#6B7280',
      config: {
        primaryColor: '#6B7280',
        secondaryColor: '#4B5563',
        accentColor: '#3B82F6',
        backgroundColor: '#FFFFFF',
        textColor: '#111827',
        cardBackgroundColor: '#FFFFFF',
        cardBorderColor: '#F3F4F6',
        textMutedColor: '#6B7280',
        fontFamily: 'Inter',
        borderRadius: 'small',
        shadowIntensity: 'none'
      }
    }
  ];

  const currentTheme = formData?.configuration?.themeId || null;

  const applyTheme = (theme) => {
    setFormData({
      ...formData,
      configuration: {
        ...formData.configuration,
        ...theme.config,
        themeId: theme.id
      }
    });
  };

  return (
    <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <CardHeader className="pb-1.5 pt-2.5 px-3">
        <CardTitle className="text-xs flex items-center text-gray-900 dark:text-gray-100">
          <Palette className="w-3.5 h-3.5 mr-1.5" />
          Thèmes prédéfinis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1.5 px-3 pb-3">
        <div className="grid grid-cols-1 gap-1.5">
          {themes.map((theme) => {
            const isSelected = currentTheme === theme.id;
            return (
              <button
                key={theme.id}
                onClick={() => applyTheme(theme)}
                className={`p-2 border rounded-lg text-left group transition-all ${
                  isSelected 
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                    : 'border-border hover:bg-accent hover:border-primary/50'
                }`}
              >
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    <div 
                      className="w-8 h-8 rounded-lg border-2 border-white shadow-sm flex items-center justify-center"
                      style={{ backgroundColor: theme.preview }}
                    >
                      {isSelected && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-1.5">
                      <div className="font-medium text-sm">{theme.name}</div>
                      {isSelected && (
                        <Badge variant="default" className="text-[10px] px-1.5 py-0">
                          Actuel
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground leading-tight">{theme.description}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        
        <div className="mt-1.5 p-1.5 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="text-xs">
            <p className="font-medium text-blue-800 dark:text-blue-200 mb-0.5 text-[10px]">💡 Conseil</p>
            <p className="text-blue-700 dark:text-blue-300 text-[9px] leading-tight">
              Choisissez un thème qui correspond à l'ambiance de votre commerce.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ThemeSelector;
