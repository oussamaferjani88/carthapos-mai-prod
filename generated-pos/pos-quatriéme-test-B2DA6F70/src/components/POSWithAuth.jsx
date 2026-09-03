import { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Shield, Lock, User, UserCheck, Settings, Store } from 'lucide-react';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isPreviewMode, isProductionMode } from '../utils/environment';

const RENDER_WARN_THRESHOLD = 10;

const POSWithAuth = ({ config, children }) => {
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, logout, loading: authLoading } = useAuth();
  
  const previewMode = isPreviewMode();

  // Two-step login for preview only: Step 1 = role selection, Step 2 = password entry
  const [loginStep, setLoginStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // ⚡ UNCONTROLLED FORM: Browser manages input values natively, zero React re-render on keystroke
  const formRef = useRef(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ⚡ Performance monitoring
  const renderCountRef = useRef(0);
  useEffect(() => {
    renderCountRef.current++;
    console.log(`⚡ [AUTH] Render #${renderCountRef.current} (user=${!!user}, step=${loginStep})`);
    if (renderCountRef.current > RENDER_WARN_THRESHOLD) {
      console.warn(`⚠️ [AUTH] High render count: ${renderCountRef.current} — investigate unnecessary re-renders`);
    }
  });

  // Utilisateurs prédéfinis avec rôles (pour la démo)
  const defaultUsers = [
    { 
      username: 'admin', 
      password: 'admin123', 
      role: 'admin', 
      name: 'Administrateur',
      permissions: ['all'] 
    },
    { 
      username: 'caissier', 
      password: 'caissier123', 
      role: 'cashier', 
      name: 'Caissier',
      permissions: ['sales', 'customers'] 
    },
    { 
      username: 'manager', 
      password: 'manager123', 
      role: 'manager', 
      name: 'Manager',
      permissions: ['sales', 'products', 'customers', 'reports', 'inventory'] 
    }
  ];

  // Handle role selection (Step 1)
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setLoginStep(2);
    setError('');
    console.log(`⚡ [AUTH] Role selected: ${role}`);
  };

  // Handle back to role selection
  const handleBack = () => {
    setLoginStep(1);
    setSelectedRole(null);
    if (formRef.current) formRef.current.reset();
    setError('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const startTime = Date.now();
    
    const form = formRef.current;
    if (!form) return;
    
    const fd = new FormData(form);
    const creds = {
      username: previewMode ? selectedRole : (fd.get('username') || ''),
      password: fd.get('password') || ''
    };
    console.log(`⏱️ [AUTH] Credentials read from FormData in ${Date.now() - startTime}ms`);

    setLoading(true);
    setError('');

    try {
      const ipcStart = Date.now();
      await login(creds);
      const ipcElapsed = Date.now() - ipcStart;
      console.log(`⏱️ [AUTH] login() resolved in ${ipcElapsed}ms — ${ipcElapsed > 100 ? '⚠️ BACKEND LAG' : '✅ OK'}`);
      console.log(`⏱️ [AUTH] Total handleLogin: ${Date.now() - startTime}ms`);
      
      form.reset();
    } catch (err) {
      setError('Mot de passe incorrect');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    const startTime = Date.now();
    logout();
    if (formRef.current) formRef.current.reset();
    setError('');
    console.log(`⏱️ [AUTH] logout completed in ${Date.now() - startTime}ms`);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'superadmin': return <Shield className="w-4 h-4" />;
      case 'admin': return <Settings className="w-4 h-4" />;
      case 'manager': return <UserCheck className="w-4 h-4" />;
      case 'cashier': return <User className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'superadmin': return 'Super admin';
      case 'admin': return 'Administrateur';
      case 'manager': return 'Manager';
      case 'cashier': return 'Caissier';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role) => {
    switch (role) {
      case 'superadmin': return 'default';
      case 'admin': return 'destructive';
      case 'manager': return 'default';
      case 'cashier': return 'secondary';
      default: return 'outline';
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: config?.theme?.backgroundColor 
            ? `linear-gradient(135deg, ${config.theme.backgroundColor} 0%, ${config.theme.primaryColor}10 100%)`
            : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)'
        }}
      >
        <div className="w-full max-w-md space-y-4">
        <Card className="w-full shadow-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg overflow-hidden"
              style={{ 
                backgroundColor: config?.theme?.primaryColor || '#3b82f6',
                background: `linear-gradient(135deg, ${config?.theme?.primaryColor || '#3b82f6'} 0%, ${config?.theme?.accentColor || '#6366f1'} 100%)`
              }}
            >
              {config?.theme?.logo || config?.businessInfo?.logo ? (
                <img 
                  src={config?.theme?.logo || config?.businessInfo?.logo} 
                  alt={config?.theme?.businessName || 'Logo'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div className={`w-full h-full flex items-center justify-center ${config?.theme?.logo || config?.businessInfo?.logo ? 'hidden' : ''}`}>
                <Store className="w-8 h-8 text-white" />
              </div>
            </div>
            <CardTitle 
              className="text-3xl font-bold mb-2"
              style={{ color: config?.theme?.textColor || '#1f2937' }}
            >
              {config?.theme?.businessName || config?.businessInfo?.name || 'POS System'}
            </CardTitle>
            <p className="text-sm mb-1" style={{ color: config?.theme?.textMutedColor || '#6b7280' }}>
              {config?.theme?.welcomeText || `Bienvenue chez ${config?.theme?.businessName || 'POS System'}`}
            </p>
            <CardDescription className="text-base">
              {previewMode && loginStep === 1 ? 'Sélectionnez votre rôle' : 'Connexion sécurisée'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {/* STEP 1: Role Selection */}
            {previewMode && loginStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600 text-center mb-4">
                  Choisissez votre rôle pour vous connecter
                </p>
                
                {/* Admin Button */}
                <button
                  onClick={() => handleRoleSelect('admin')}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Settings className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">Administrateur</h3>
                      <p className="text-sm text-gray-500">Accès complet au système</p>
                    </div>
                    <div className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Caissier Button */}
                <button
                  onClick={() => handleRoleSelect('caissier')}
                  className="w-full p-5 border-2 border-gray-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left flex-1">
                      <h3 className="font-semibold text-lg text-gray-900">Caissier</h3>
                      <p className="text-sm text-gray-500">Gestion des ventes</p>
                    </div>
                    <div className="text-green-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Demo accounts info - Only in preview mode */}
                {previewMode && (
                  <div className="mt-6 text-xs bg-muted/50 p-4 rounded-lg space-y-2">
                    <p className="font-medium text-center mb-3">Comptes de démonstration :</p>
                    <div className="space-y-2">
                      {defaultUsers.map((user, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            {getRoleIcon(user.role)}
                            <span className="font-medium">{user.username}</span>
                            <Badge variant={getRoleBadgeVariant(user.role)} className="text-xs py-0 px-1">
                              {getRoleLabel(user.role)}
                            </Badge>
                          </div>
                          <span className="text-muted-foreground">{user.password}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Password Entry */}
            {((previewMode && loginStep === 2) || !previewMode) && (
              <form ref={formRef} onSubmit={handleLogin} className="space-y-4">
                {/* Selected Role Display (preview mode only) */}
                {previewMode ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        selectedRole === 'admin'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-br from-green-500 to-emerald-600'
                      }`}>
                        {selectedRole === 'admin' ? (
                          <Settings className="w-5 h-5 text-white" />
                        ) : (
                          <User className="w-5 h-5 text-white" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">Connexion en tant que</p>
                        <p className="font-semibold text-gray-900">
                          {selectedRole === 'admin' ? 'Administrateur' : 'Caissier'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleBack}
                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Changer
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-900 font-medium">Connexion sécurisée POS</p>
                    <p className="text-xs text-blue-700 mt-1">
                      Entrez vos identifiants administrateur ou caissier.
                    </p>
                  </div>
                )}

                {!previewMode && (
                  <div className="space-y-2">
                    <Label htmlFor="username" className="flex items-center text-sm font-medium">
                      <User className="w-4 h-4 mr-2" />
                      Nom d'utilisateur
                    </Label>
                    <Input
                      id="username"
                      name="username"
                      type="text"
                      defaultValue=""
                      placeholder="admin"
                      className="h-11"
                      required
                      autoFocus
                    />
                  </div>
                )}

                {/* Password Field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="flex items-center text-sm font-medium">
                    <Lock className="w-4 h-4 mr-2" />
                    Mot de passe
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      defaultValue=""
                      placeholder="••••••••"
                      className="h-11 pr-10"
                      required
                      autoFocus={previewMode}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                      aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                    {error}
                  </div>
                )}

                {/* Submit Button */}
                <Button 
                  type="submit" 
                  className="w-full h-11 text-base font-medium"
                  disabled={loading}
                  style={{ 
                    backgroundColor: config?.theme?.primaryColor || '#3b82f6',
                    background: loading ? undefined : `linear-gradient(135deg, ${config?.theme?.primaryColor || '#3b82f6'} 0%, ${config?.theme?.accentColor || '#6366f1'} 100%)`
                  }}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                      Connexion...
                    </div>
                  ) : 'Se connecter'}
                </Button>

                {/* Back Button (preview mode only) */}
                {previewMode && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="w-full text-sm text-gray-600 hover:text-gray-800 py-2"
                  >
                    ← Retour à la sélection de rôle
                  </button>
                )}
              </form>
            )}
          </CardContent>
        </Card>
        </div>

        {/* Business Info Footer */}
        {(config?.businessInfo?.address || config?.businessInfo?.phone || config?.businessInfo?.email) && (
          <div 
            className="text-center p-3 rounded-lg backdrop-blur-sm"
            style={{ 
              backgroundColor: config?.theme?.textColor ? `${config.theme.textColor}08` : '#00000008',
              color: config?.theme?.textMutedColor || '#6b7280'
            }}
          >
            <div className="text-xs space-y-1">
              {config.businessInfo.address && <p>{config.businessInfo.address}</p>}
              {config.businessInfo.phone && <p>{config.businessInfo.phone}</p>}
              {config.businessInfo.email && <p>{config.businessInfo.email}</p>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Injecter les informations de l'utilisateur dans les enfants
  return (
    <div data-user-role={user?.role} data-user-permissions={user?.permissions?.join(',')}>
      {children}
    </div>
  );
};

export default POSWithAuth;
