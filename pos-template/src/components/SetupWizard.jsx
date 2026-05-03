import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Shield, Lock, CheckCircle, AlertCircle } from 'lucide-react';

export default function SetupWizard({ onComplete }) {
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.password || !formData.confirmPassword) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.password.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      setLoading(true);

      // Create admin user with fixed username "admin"
      if (window.electronAPI) {
        let adminUser = null;
        try {
          adminUser = await window.electronAPI.createAdminUser({
            username: 'admin', // Fixed username
            password: formData.password
          });
          console.log('✅ Admin user created successfully:', adminUser);
        } catch (createErr) {
          // If admin already exists (e.g., seeded demo), update its password instead
          const msg = (createErr && createErr.message) ? createErr.message.toLowerCase() : '';
          if (msg.includes('already exists')) {
            console.warn('⚠️ Admin already exists, updating password instead...');
            await window.electronAPI.updateAdminPassword(formData.password);
            // Authenticate to get full user payload
            adminUser = await window.electronAPI.authenticateUser('admin', formData.password);
            console.log('✅ Admin password updated and authenticated successfully');
          } else {
            throw createErr;
          }
        }

        // Pass user to parent for auto-login (parent will handle localStorage)
        onComplete(adminUser);
      } else {
        throw new Error('Electron API not available');
      }
    } catch (error) {
      console.error('❌ Setup error:', error);
      setError('Erreur lors de la création du compte: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        {/* Header with gradient */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-center mb-2">
            Bienvenue dans votre POS!
          </h1>
          <p className="text-center text-blue-100">
            Créez votre mot de passe administrateur
          </p>
        </div>

        <CardContent className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info Badge */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Compte administrateur</p>
                  <p className="text-blue-600">
                    Nom d'utilisateur: <span className="font-mono font-semibold">admin</span>
                  </p>
                </div>
              </div>
            </div>

            {/* Password Fields */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    className="h-12 pl-11 text-base"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                  Minimum 6 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                  Confirmer le mot de passe *
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                    required
                    className="h-12 pl-11 text-base"
                  />
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full h-13 text-base font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                  Configuration en cours...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Créer mon compte et démarrer
                </>
              )}
            </Button>
          </form>

          {/* Footer Info */}
          <div className="mt-6 pt-6 border-t text-center space-y-3">
            <p className="text-sm text-gray-600">
              Vous pourrez créer des comptes caissiers après la configuration
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Configuration sécurisée</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
