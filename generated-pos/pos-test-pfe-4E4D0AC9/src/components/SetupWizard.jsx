import { useState, useEffect } from 'react';
import { Shield, Lock, CheckCircle, AlertCircle, Eye, EyeOff, Globe, Banknote, MapPin } from 'lucide-react';
import { useAppConfig } from '../hooks/useAppConfig';

export default function SetupWizard({ onComplete }) {
  const { config } = useAppConfig();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [admin, setAdmin] = useState({
    fullName: '',
    username: 'admin',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [passwordChecks, setPasswordChecks] = useState({});

  const theme = config?.theme || {};
  const businessName = theme.businessName || 'Mon Commerce';
  const currency = theme.currency || 'TND';
  const language = theme.language === 'fr' ? 'Français' : theme.language || 'Français';
  const timezone = theme.timezone || 'Europe/Paris';
  const countryMap = {
    'Europe/Paris': 'France',
    'Africa/Tunis': 'Tunisie',
    'Africa/Casablanca': 'Maroc',
    'Africa/Algiers': 'Algérie',
    'Africa/Dakar': 'Sénégal',
  };
  const country = countryMap[timezone] || timezone.split('/')[0];

  useEffect(() => {
    if (window.electronAPI?.validatePasswordDetailed && admin.password) {
      window.electronAPI.validatePasswordDetailed(admin.password)
        .then(setPasswordChecks)
        .catch(() => setPasswordChecks({}));
    } else if (admin.password) {
      setPasswordChecks({
        valid: admin.password.length >= 6,
        checks: { length: admin.password.length >= 6 },
      });
    } else {
      setPasswordChecks({});
    }
  }, [admin.password]);

  const updateAdmin = (key, value) => setAdmin(prev => ({ ...prev, [key]: value }));

  const canSubmit = () =>
    admin.fullName.trim().length > 0 &&
    admin.username.trim().length > 0 &&
    admin.password.length >= 6 &&
    admin.password === admin.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canSubmit()) return;
    setError('');
    setLoading(true);
    try {
      if (!window.electronAPI) throw new Error('Electron API not available');

      let adminUser = null;
      try {
        adminUser = await window.electronAPI.createAdminUser({
          username: admin.username,
          password: admin.password,
          fullName: admin.fullName,
          email: admin.email || undefined,
        });
      } catch (createErr) {
        const msg = (createErr?.message || '').toLowerCase();
        if (msg.includes('already exists')) {
          await window.electronAPI.updateAdminPassword(admin.password);
          adminUser = await window.electronAPI.authenticateUser(admin.username, admin.password);
        } else {
          throw createErr;
        }
      }

      onComplete(adminUser);
    } catch (err) {
      setError('Erreur: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-lg">
        {/* Logo & Title */}
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-md shadow-primary/10">
            <Shield size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">CarthaPos Bienvenue</h1>
          <p className="mt-1 text-lg font-semibold text-primary">{businessName}</p>
          <p className="text-muted-foreground text-xs mt-1">Configurez votre compte Super admin — accès complet, unique au premier compte.</p>
        </div>

        {/* Business Info strip */}
        <div className="bg-card border border-border/50 rounded-xl px-4 py-2.5 mb-3 shadow-sm flex items-center justify-center gap-5 flex-wrap">
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><MapPin size={12} />{country}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Banknote size={12} />{currency}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><Globe size={12} />{language}</span>
        </div>

        {/* Admin Account Card */}
        <form onSubmit={handleSubmit}>
          <div className="bg-card border border-border/50 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Lock size={14} className="text-primary" />
              <h2 className="text-sm font-semibold text-foreground">Compte administrateur</h2>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-foreground">Nom complet *</label>
                <input
                  autoFocus
                  value={admin.fullName}
                  onChange={(e) => updateAdmin('fullName', e.target.value)}
                  placeholder="Ex: Ahmed Ben Ali"
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
                />
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-foreground">Nom d'utilisateur</label>
                <input
                  value={admin.username}
                  onChange={(e) => updateAdmin('username', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5 mt-3">
              <label className="text-xs font-medium text-foreground">Email (optionnel)</label>
              <input
                type="email"
                value={admin.email}
                onChange={(e) => updateAdmin('email', e.target.value)}
                placeholder="admin@example.com"
                className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 mt-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-foreground">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={admin.password}
                    onChange={(e) => updateAdmin('password', e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-9 px-3 pr-9 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <label className="text-xs font-medium text-foreground">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={admin.confirmPassword}
                  onChange={(e) => updateAdmin('confirmPassword', e.target.value)}
                  placeholder="••••••••"
                  className="w-full h-9 px-3 rounded-lg bg-background border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
              </div>
            </div>

            {admin.password && (
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                {[
                  { key: 'length', label: '6+ caractères' },
                  { key: 'uppercase', label: 'Majuscule' },
                  { key: 'lowercase', label: 'Minuscule' },
                  { key: 'number', label: 'Chiffre' },
                  { key: 'special', label: 'Spécial' },
                ].map(({ key, label }) => {
                  const passed = passwordChecks?.checks?.[key] || passwordChecks?.[key];
                  return (
                    <div key={key} className="flex items-center gap-1 text-[10px]">
                      <div className={`w-1 h-1 rounded-full ${passed ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />
                      <span className={passed ? 'text-emerald-600' : 'text-muted-foreground'}>{label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            {admin.confirmPassword && admin.password !== admin.confirmPassword && (
              <p className="text-[11px] text-destructive mt-2">Les mots de passe ne correspondent pas</p>
            )}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-destructive bg-destructive/5 p-3 rounded-xl">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit()}
            className="w-full mt-3 h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
            ) : (
              <>
                <CheckCircle size={18} />
                Créer et démarrer
              </>
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-muted-foreground mt-3">
          Configuration sécurisée — vos données restent locales
        </p>
      </div>
    </div>
  );
}
