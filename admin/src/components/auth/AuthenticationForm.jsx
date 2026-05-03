import React, { useState } from 'react';
import { Eye, EyeOff, Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

const AuthenticationForm = ({ role, onBack, onAuthenticate, config = {} }) => {
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    pin: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdmin = role === 'admin';
  const isCashier = role === 'cashier';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Simulation d'authentification
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (isAdmin) {
        // Vérification admin (exemple)
        if (credentials.username === 'admin' && credentials.password === 'admin123') {
          onAuthenticate({
            role: 'admin',
            user: {
              id: 1,
              username: 'admin',
              fullName: 'Administrateur',
              permissions: ['all']
            }
          });
        } else {
          setError('Nom d\'utilisateur ou mot de passe incorrect');
        }
      } else if (isCashier) {
        // Vérification caissier (PIN ou nom d'utilisateur)
        const validCashiers = [
          { username: 'caissier1', pin: '1234', fullName: 'Marie Dupont', permissions: ['sales', 'customers'] },
          { username: 'caissier2', pin: '5678', fullName: 'Paul Martin', permissions: ['sales', 'reports'] }
        ];

        const cashier = validCashiers.find(c => 
          (credentials.username && c.username === credentials.username && c.pin === credentials.pin) ||
          (!credentials.username && c.pin === credentials.pin)
        );

        if (cashier) {
          onAuthenticate({
            role: 'cashier',
            user: {
              id: cashier.username === 'caissier1' ? 2 : 3,
              username: cashier.username,
              fullName: cashier.fullName,
              permissions: cashier.permissions
            }
          });
        } else {
          setError('Code PIN ou identifiants incorrects');
        }
      }
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const getRoleConfig = () => {
    if (isAdmin) {
      return {
        title: 'Connexion Administrateur',
        description: 'Accès aux fonctions d\'administration',
        icon: Lock,
        color: 'text-red-600',
        bgColor: 'bg-red-100'
      };
    } else {
      return {
        title: 'Connexion Caissier',
        description: 'Accès à l\'interface de vente',
        icon: User,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      };
    }
  };

  const roleConfig = getRoleConfig();
  const IconComponent = roleConfig.icon;

  return (
    <div 
      className={config.isPreviewMode ? "h-full flex items-center justify-center p-4" : "min-h-screen flex items-center justify-center p-4"}
      style={{ 
        background: config.gradientBackgrounds 
          ? `linear-gradient(135deg, ${config.backgroundColor || '#f8fafc'}, ${config.secondaryColor || '#e2e8f0'}20)`
          : config.backgroundColor || '#f8fafc'
      }}
    >
      <div className="w-full max-w-md">
        <Card 
          style={{
            backgroundColor: config.cardBackgroundColor || '#ffffff',
            borderColor: config.cardBorderColor || '#e5e7eb',
            borderRadius: config.borderRadius || '8px'
          }}
        >
          <CardHeader className="text-center">
            {/* Mode Preview Indicator */}
            {config.isPreviewMode && (
              <div 
                className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg"
                style={{
                  backgroundColor: '#fff7ed',
                  borderColor: '#fed7aa',
                }}
              >
                <p className="text-sm text-orange-800 font-medium">
                  🎭 Mode Prévisualisation
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {isAdmin 
                    ? 'Utilisez admin/admin123 pour tester' 
                    : 'Utilisez caissier1/1234 ou caissier2/5678 pour tester'
                  }
                </p>
              </div>
            )}

            {/* Back Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="absolute top-4 left-4 p-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>

            {/* Icon */}
            <div className={`w-16 h-16 ${roleConfig.bgColor} rounded-full flex items-center justify-center mx-auto mb-4`}>
              <IconComponent className={`w-8 h-8 ${roleConfig.color}`} />
            </div>

            <CardTitle 
              className="text-2xl font-bold"
              style={{ color: config.textColor || '#1f2937' }}
            >
              {roleConfig.title}
            </CardTitle>
            <p 
              className="text-sm mt-2"
              style={{ color: config.textMutedColor || '#6b7280' }}
            >
              {roleConfig.description}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm text-red-600">{error}</span>
                </div>
              )}

              {/* Admin Fields */}
              {isAdmin && (
                <>
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: config.textColor || '#1f2937' }}
                    >
                      Nom d'utilisateur
                    </label>
                    <input
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: config.cardBorderColor || '#e5e7eb',
                        focusRingColor: config.primaryColor || '#3b82f6'
                      }}
                      placeholder="admin"
                      required
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: config.textColor || '#1f2937' }}
                    >
                      Mot de passe
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2"
                        style={{ 
                          borderColor: config.cardBorderColor || '#e5e7eb',
                          focusRingColor: config.primaryColor || '#3b82f6'
                        }}
                        placeholder="••••••••"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-gray-400" />
                        ) : (
                          <Eye className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              {/* Cashier Fields */}
              {isCashier && (
                <>
                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: config.textColor || '#1f2937' }}
                    >
                      Nom d'utilisateur (optionnel)
                    </label>
                    <input
                      type="text"
                      value={credentials.username}
                      onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2"
                      style={{ 
                        borderColor: config.cardBorderColor || '#e5e7eb',
                        focusRingColor: config.primaryColor || '#3b82f6'
                      }}
                      placeholder="caissier1"
                    />
                  </div>

                  <div>
                    <label 
                      className="block text-sm font-medium mb-2"
                      style={{ color: config.textColor || '#1f2937' }}
                    >
                      Code PIN
                    </label>
                    <input
                      type="password"
                      value={credentials.pin}
                      onChange={(e) => setCredentials(prev => ({ ...prev, pin: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-center text-2xl tracking-widest"
                      style={{ 
                        borderColor: config.cardBorderColor || '#e5e7eb',
                        focusRingColor: config.primaryColor || '#3b82f6'
                      }}
                      placeholder="••••"
                      maxLength="4"
                      pattern="[0-9]{4}"
                      required
                    />
                    <p className="text-xs mt-1" style={{ color: config.textMutedColor || '#6b7280' }}>
                      Saisissez votre code PIN à 4 chiffres
                    </p>
                  </div>
                </>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 font-medium"
                style={{
                  backgroundColor: config.primaryColor || '#3b82f6',
                  color: '#ffffff'
                }}
              >
                {loading ? 'Connexion...' : 'Se connecter'}
              </Button>

              {/* Demo Credentials */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-600 mb-2">Identifiants de démonstration :</p>
                {isAdmin ? (
                  <div className="text-xs text-gray-500">
                    <p>Utilisateur: <code>admin</code></p>
                    <p>Mot de passe: <code>admin123</code></p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    <p>Caissier 1: PIN <code>1234</code></p>
                    <p>Caissier 2: PIN <code>5678</code></p>
                  </div>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthenticationForm;
