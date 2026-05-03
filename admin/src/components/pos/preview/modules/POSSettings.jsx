import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../ui/card';
import { Settings, Info } from 'lucide-react';

export const POSSettings = ({ config, modules }) => {
  const styles = {
    card: {
      backgroundColor: config.backgroundColor,
      borderColor: config.cardBorderColor,
      color: config.textColor
    }
  };

  const safeModules = Array.isArray(modules) ? modules : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: config.textColor }}>
          Paramètres
        </h1>
        <p style={{ color: config.textMutedColor }}>
          Configurez votre système POS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Settings className="mr-2 h-5 w-5" />
                Configuration générale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Nom de l'établissement</label>
                <input
                  type="text"
                  value={config.businessName}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  style={{ borderColor: config.cardBorderColor }}
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium">Couleur principale</label>
                <input
                  type="color"
                  value={config.primaryColor}
                  className="w-full mt-1 h-10 border rounded-lg"
                  readOnly
                />
              </div>
              <div>
                <label className="text-sm font-medium">Position de la navigation</label>
                <select
                  value={config.navbarPosition}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  style={{ borderColor: config.cardBorderColor }}
                  disabled
                >
                  <option value="left">Gauche</option>
                  <option value="top">Haut</option>
                </select>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card style={styles.card}>
            <CardHeader>
              <CardTitle>Modules actifs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {safeModules.slice(0, 4).map((module, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: config.primaryColor }}
                    />
                    <span className="text-sm">
                      {typeof module === 'string' ? module : module.name || 'Module'}
                    </span>
                  </div>
                ))}
                {safeModules.length > 4 && (
                  <div className="text-xs" style={{ color: config.textMutedColor }}>
                    +{safeModules.length - 4} autres modules
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card style={styles.card}>
            <CardHeader>
              <CardTitle className="flex items-center text-lg">
                <Info className="mr-2 h-5 w-5" />
                Système
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-sm font-medium">Version</label>
                <p className="text-xs" style={{ color: config.textMutedColor }}>1.0.0</p>
              </div>
              <div>
                <label className="text-sm font-medium">Base de données</label>
                <p className="text-xs" style={{ color: config.textMutedColor }}>SQLite</p>
              </div>
              <div>
                <label className="text-sm font-medium">Dernière sauvegarde</label>
                <p className="text-xs" style={{ color: config.textMutedColor }}>
                  {new Date().toLocaleDateString('fr-FR')}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
