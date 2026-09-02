import { useState, useEffect } from 'react'
import { Lock, LogOut, Shield } from 'lucide-react'
import AuthKeyboard from './AuthKeyboard'

const INITIALS_COLORS = [
  'bg-primary/15 text-primary',
  'bg-blue-500/15 text-blue-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-orange-500/15 text-orange-600',
  'bg-purple-500/15 text-purple-600',
]

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

function getInitialsColor(name) {
  if (!name) return INITIALS_COLORS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return INITIALS_COLORS[Math.abs(hash) % INITIALS_COLORS.length]
}

export default function LockScreen({ user, onUnlock, onLogout, config }) {
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  const handlePasswordSubmit = async (password) => {
    setError('')
    setLoading(true)
    try {
      const result = await window.electronAPI.authenticateUser(user.username, password)
      if (result && result.id) {
        onUnlock()
      } else {
        setError('Mot de passe incorrect')
      }
    } catch (err) {
      setError(err?.message || 'Mot de passe incorrect')
    } finally {
      setLoading(false)
    }
  }

  const timeStr = time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const dateStr = time.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <p className="text-5xl font-light text-foreground tracking-tight">{timeStr}</p>
          <p className="text-sm text-muted-foreground mt-1 capitalize">{dateStr}</p>
        </div>

        <div className="bg-card/90 backdrop-blur-lg border border-border/50 rounded-3xl p-6 shadow-2xl shadow-black/5 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Lock size={16} className="text-primary" />
            <p className="text-sm font-medium text-muted-foreground">POS verrouillé</p>
          </div>

          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover mx-auto mb-3 ring-4 ring-border" />
          ) : (
            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-3 ring-4 ring-border ${getInitialsColor(user.full_name)}`}>
              {getInitials(user.full_name)}
            </div>
          )}

          <p className="font-semibold text-foreground text-sm">{user.full_name || user.username}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-4 capitalize flex items-center justify-center gap-1">
            <Shield size={10} />
            {user.role === 'superadmin' ? 'Super admin' : user.role === 'admin' ? 'Administrateur' : user.role}
          </p>

          <AuthKeyboard
            onSubmit={handlePasswordSubmit}
            onBack={onLogout}
            error={error}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
