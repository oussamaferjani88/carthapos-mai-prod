// Configuration du thème - sera remplacée par la génération automatique
export const themeConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#6B7280',
    accent: '#10B981',
    background: '#FFFFFF',
    cardBackground: '#F9FAFB',
    text: '#111827',
    textMuted: '#6B7280',
    border: '#E5E7EB'
  },
  typography: {
    fontFamily: 'Inter',
    fontSize: '14px',
    fontWeight: 'normal'
  },
  layout: {
    navbarPosition: 'left',
    spacingScale: 1,
    maxWidth: '1200px',
    compactMode: false,
    navbarCollapsible: false
  },
  effects: {
    theme: 'light',
    borderRadius: '8px',
    shadowIntensity: 1,
    opacity: 1,
    backdropBlur: false,
    animations: true,
    shadows: true,
    gradientBackgrounds: false,
    glassEffect: false
  }
};

export function useTheme() {
  return themeConfig;
}

/**
 * Applique le thème dynamiquement avec intégration Tailwind
 * Résout le problème des variables CSS non synchronisées
 */
export function applyTheme() {
  return new Promise((resolve) => {
    console.log('🎨 Application du thème personnalisé...');
    
    const root = document.documentElement;
    
    // 1. Appliquer les variables CSS pour Tailwind
    root.style.setProperty('--color-primary', themeConfig.colors.primary);
    root.style.setProperty('--color-secondary', themeConfig.colors.secondary);
    root.style.setProperty('--color-accent', themeConfig.colors.accent);
    root.style.setProperty('--color-background', themeConfig.colors.background);
    root.style.setProperty('--color-card-background', themeConfig.colors.cardBackground);
    root.style.setProperty('--color-text', themeConfig.colors.text);
    root.style.setProperty('--color-text-muted', themeConfig.colors.textMuted);
    root.style.setProperty('--color-border', themeConfig.colors.border);
    
    // 2. Appliquer la typographie
    root.style.setProperty('--font-family', themeConfig.typography.fontFamily);
    root.style.setProperty('--font-size', themeConfig.typography.fontSize);
    root.style.setProperty('--font-weight', themeConfig.typography.fontWeight);
    
    // 3. Appliquer les effets
    root.style.setProperty('--border-radius', themeConfig.effects.borderRadius);
    root.style.setProperty('--shadow-intensity', themeConfig.effects.shadowIntensity);
    root.style.setProperty('--opacity', themeConfig.effects.opacity);
    root.style.setProperty('--spacing-scale', themeConfig.layout.spacingScale);
    root.style.setProperty('--max-width', themeConfig.layout.maxWidth);
    
    // 4. Appliquer les classes conditionnelles au body
    const body = document.body;
    
    // Nettoyer les anciennes classes
    body.classList.remove('dark-theme', 'compact-mode', 'animations-enabled', 'navbar-left', 'navbar-right', 'navbar-top');
    
    // Appliquer les nouvelles classes
    if (themeConfig.effects.theme === 'dark') {
      body.classList.add('dark-theme');
    }
    
    if (themeConfig.layout.compactMode) {
      body.classList.add('compact-mode');
    }
    
    if (themeConfig.effects.animations) {
      body.classList.add('animations-enabled');
    }
    
    // Classes pour la position de la navbar
    body.classList.add(`navbar-${themeConfig.layout.navbarPosition}`);
    
    // 5. Forcer le recalcul des styles pour Tailwind
    // Ceci garantit que les nouvelles variables CSS sont prises en compte
    const style = document.createElement('style');
    style.textContent = `
      .theme-primary { color: var(--color-primary) !important; }
      .theme-bg-primary { background-color: var(--color-primary) !important; }
      .theme-border-primary { border-color: var(--color-primary) !important; }
    `;
    document.head.appendChild(style);
    
    // Petit délai pour s'assurer que tout est appliqué
    setTimeout(() => {
      console.log('✅ Thème appliqué:', {
        colors: themeConfig.colors,
        layout: themeConfig.layout,
        bodyClasses: body.className
      });
      resolve();
    }, 10);
  });
}

/**
 * Initialise le thème au chargement
 * Compatible avec l'injection automatique du générateur
 */
export function initializeTheme() {
  console.log('🚀 Initialisation du thème...');
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      applyTheme();
    });
  } else {
    applyTheme();
  }
}

/**
 * Hook React pour utiliser la configuration du thème
 */
export function useThemeConfig() {
  return themeConfig;
}

/**
 * Utilitaire pour générer les classes conditionnelles
 * Résout le problème des styles statiques vs dynamiques
 */
export function getThemeClasses(baseClasses = '', options = {}) {
  let classes = baseClasses;
  
  // Ajouter les classes basées sur la configuration
  if (themeConfig.layout.compactMode && options.compact) {
    classes += ` ${options.compact}`;
  }
  
  if (themeConfig.effects.animations && options.animated) {
    classes += ` ${options.animated}`;
  }
  
  if (themeConfig.effects.shadows && options.shadowed) {
    classes += ` ${options.shadowed}`;
  }
  
  return classes.trim();
}

export default themeConfig;
