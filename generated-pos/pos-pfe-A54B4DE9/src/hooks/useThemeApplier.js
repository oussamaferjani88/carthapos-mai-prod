import { useEffect } from 'react';

// Helper function to convert hex to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '0, 0, 0';
}

// Helper function to determine text color based on background
function getContrastColor(hex) {
  const rgb = hexToRgb(hex);
  const [r, g, b] = rgb.split(', ').map(Number);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
}

export const useThemeApplier = (theme = {}) => {
  useEffect(() => {
    const root = document.documentElement;
    console.log('[POS DEBUG] [ThemeApplier] Applying theme:', JSON.stringify(theme, null, 2));

    // Apply colors from new theme structure
    if (theme.colors) {
      const { colors } = theme;
      
      // Primary colors
      if (colors.primary) {
        root.style.setProperty('--primary', colors.primary);
        root.style.setProperty('--primary-foreground', getContrastColor(colors.primary));
        root.style.setProperty('--ring', colors.primary);
      }
      
      // Secondary colors
      if (colors.secondary) {
        root.style.setProperty('--secondary', colors.secondary);
        root.style.setProperty('--secondary-foreground', getContrastColor(colors.secondary));
      }
      
      // Accent colors
      if (colors.accent) {
        root.style.setProperty('--accent', colors.accent);
        root.style.setProperty('--accent-foreground', getContrastColor(colors.accent));
      }
      
      // Background colors
      if (colors.background) {
        root.style.setProperty('--background', colors.background);
        document.body.style.backgroundColor = colors.background;
      }
      
      // Card background
      if (colors.cardBackground) {
        root.style.setProperty('--card', colors.cardBackground);
        root.style.setProperty('--card-foreground', getContrastColor(colors.cardBackground));
        root.style.setProperty('--popover', colors.cardBackground);
        root.style.setProperty('--popover-foreground', getContrastColor(colors.cardBackground));
      }
      
      // Text colors
      if (colors.text) {
        root.style.setProperty('--foreground', colors.text);
      }
      
      // Border colors
      if (colors.border) {
        root.style.setProperty('--border', colors.border);
        root.style.setProperty('--input', colors.border);
      }
    }

    // Apply typography
    if (theme.typography) {
      const { typography } = theme;
      
      if (typography.fontFamily) {
        const fontUrls = {
          'Inter': 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
          'Roboto': 'https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap',
          'Open Sans': 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap',
          'Poppins': 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
          'Montserrat': 'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap',
          'Source Sans Pro': 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@400;600;700&display=swap'
        };

        // Load font if not already loaded
        const fontUrl = fontUrls[typography.fontFamily];
        if (fontUrl && !document.querySelector(`link[href="${fontUrl}"]`)) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = fontUrl;
          document.head.appendChild(link);
        }

        // Apply font family
        root.style.setProperty('--font-family', `"${typography.fontFamily}", sans-serif`);
        document.body.style.fontFamily = `"${typography.fontFamily}", sans-serif`;
      }
      
      if (typography.fontSize) {
        root.style.setProperty('--font-size', typography.fontSize);
        document.body.style.fontSize = typography.fontSize;
      }
      
      if (typography.fontWeight) {
        root.style.setProperty('--font-weight', typography.fontWeight);
      }
    }

    // Apply effects
    if (theme.effects) {
      const { effects } = theme;
      
      // Border radius
      if (effects.borderRadius) {
        const radiusValues = {
          'none': '0px',
          'small': '4px',
          'medium': '8px',
          'large': '12px',
          'xl': '16px'
        };

        const radiusValue = radiusValues[effects.borderRadius] || '8px';
        root.style.setProperty('--radius', radiusValue);

        // Apply to common border radius classes
        let style = document.getElementById('theme-border-radius');
        if (!style) {
          style = document.createElement('style');
          style.id = 'theme-border-radius';
          document.head.appendChild(style);
        }
        
        style.textContent = `
          .rounded, .rounded-md, .rounded-lg {
            border-radius: ${radiusValue} !important;
          }
          .rounded-sm {
            border-radius: calc(${radiusValue} * 0.5) !important;
          }
          .rounded-xl {
            border-radius: calc(${radiusValue} * 1.5) !important;
          }
          .rounded-2xl {
            border-radius: calc(${radiusValue} * 2) !important;
          }
        `;
      }
      
      // Shadow intensity
      if (effects.shadowIntensity !== undefined) {
        const shadowValues = {
          0: 'none',
          0.5: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          1: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
          1.5: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          2: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
        };
        
        const shadowValue = shadowValues[effects.shadowIntensity] || shadowValues[1];
        root.style.setProperty('--shadow', shadowValue);
        
        let style = document.getElementById('theme-shadows');
        if (!style) {
          style = document.createElement('style');
          style.id = 'theme-shadows';
          document.head.appendChild(style);
        }
        
        style.textContent = `
          .shadow, .shadow-md, .shadow-lg {
            box-shadow: ${shadowValue} !important;
          }
        `;
      }
    }

    // Apply layout
    if (theme.layout) {
      const { layout } = theme;
      
      if (layout.navbarPosition) {
        root.style.setProperty('--navbar-position', layout.navbarPosition);
      }
      
      if (layout.spacingScale) {
        root.style.setProperty('--spacing-scale', layout.spacingScale.toString());
      }
      
      if (layout.maxWidth) {
        root.style.setProperty('--max-width', layout.maxWidth);
      }
    }

    // Update page title
    if (theme.appTitle) {
      document.title = theme.appTitle;
    }

    // Apply business name to relevant elements
    if (theme.businessName) {
      // This can be used by components that need to display the business name
      root.style.setProperty('--business-name', `"${theme.businessName}"`);
    }

    // Set muted colors if not specified
    if (!theme.colors?.muted) {
      root.style.setProperty('--muted', '#f1f5f9');
      root.style.setProperty('--muted-foreground', '#64748b');
    }

  }, [theme]);
};
