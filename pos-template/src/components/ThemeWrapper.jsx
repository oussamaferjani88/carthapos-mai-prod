import { useState, useEffect } from 'react';
import { applyTheme } from '../config/theme.js';

/**
 * ThemeWrapper - Garantit que le thème est appliqué avant le rendu des composants
 * Résout le problème d'initialisation tardive du thème
 */
export default function ThemeWrapper({ children }) {
  const [themeLoaded, setThemeLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadTheme = async () => {
      try {
        console.log('🎨 Initialisation du thème...');
        
        // Appliquer le thème avant tout rendu
        await applyTheme();
        
        // Petite pause pour s'assurer que les CSS variables sont appliquées
        await new Promise(resolve => setTimeout(resolve, 50));
        
        console.log('✅ Thème appliqué avec succès');
        setThemeLoaded(true);
      } catch (err) {
        console.error('❌ Erreur lors de l\'application du thème:', err);
        setError(err);
        // Même en cas d'erreur, on continue le rendu avec le thème par défaut
        setThemeLoaded(true);
      }
    };

    loadTheme();
  }, []);

  // Écran de chargement minimal pendant l'application du thème
  if (!themeLoaded) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#f9fafb',
        fontFamily: 'Inter, sans-serif'
      }}>
        <div style={{
          textAlign: 'center',
          color: '#6b7280'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem'
          }}></div>
          <p>Chargement du thème...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Si erreur mais on continue quand même
  if (error) {
    console.warn('Thème chargé avec des erreurs:', error);
  }

  return <>{children}</>;
}
