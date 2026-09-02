import { useState, useEffect, useRef } from 'react'
import { Search, Lock, Clock, Shield, User, ChefHat, Banknote, X } from 'lucide-react'

const ROLE_COLORS = {
  superadmin: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  admin: 'bg-destructive/10 text-destructive border-destructive/20',
  manager: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  cashier: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  server: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
}

const ROLE_LABELS = {
  superadmin: 'Super admin',
  admin: 'Administrateur',
  manager: 'Gérant',
  cashier: 'Caissier',
  server: 'Serveur',
}

const ROLE_ICONS = {
  superadmin: Shield,
  admin: Shield,
  manager: User,
  cashier: Banknote,
  server: ChefHat,
}

const INITIALS_COLORS = [
  'bg-primary/15 text-primary',
  'bg-blue-500/15 text-blue-600',
  'bg-emerald-500/15 text-emerald-600',
  'bg-orange-500/15 text-orange-600',
  'bg-purple-500/15 text-purple-600',
  'bg-rose-500/15 text-rose-600',
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

function timeAgo(dateStr) {
  if (!dateStr) return null
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return "à l'instant"
  if (diff < 3600) return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'hier'
  return `il y a ${Math.floor(diff / 86400)} j`
}

export default function UserSelectScreen({ config, onUserSelect, loading: externalLoading }) {
  const [users, setUsers] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState(null)
  const searchRef = useRef(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [active, recent] = await Promise.all([
          window.electronAPI.getActiveUsersForLogin(),
          window.electronAPI.getRecentLogins(5),
        ])
        setUsers(Array.isArray(active) ? active : [])
        setRecentUsers(Array.isArray(recent) ? recent : [])
      } catch (err) {
        console.error('Failed to load users:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = users.filter((u) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    )
  })

  const recentFiltered = recentUsers
    .map((r) => ({ ...users.find((u) => u.id === r.user_id), last_login: r.login_at }))
    .filter(Boolean)

  const showSearch = users.length > 4

  const handleUserClick = (user) => {
    if (user.locked_until && new Date(user.locked_until) > new Date()) return
    onUserSelect(user)
  }

  const renderUserCard = (user, isRecent = false) => {
    const locked = user.locked_until && new Date(user.locked_until) > new Date()
    const RoleIcon = ROLE_ICONS[user.role] || User

    return (
      <button
        key={user.id + (isRecent ? '-recent' : '')}
        onClick={() => handleUserClick(user)}
        onMouseEnter={() => setHoveredId(user.id + (isRecent ? '-recent' : ''))}
        onMouseLeave={() => setHoveredId(null)}
        disabled={locked || externalLoading}
        className={`relative flex flex-col items-center p-5 rounded-2xl border transition-all duration-200 cursor-pointer group
          ${locked
            ? 'bg-muted/30 border-border/30 opacity-50 cursor-not-allowed'
            : 'bg-card/80 border-border/50 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-1 active:scale-[0.97]'
          }
          ${hoveredId === user.id + (isRecent ? '-recent' : '') && !locked ? 'border-primary/40 shadow-lg shadow-primary/5 -translate-y-1' : ''}
        `}
      >
        {locked && (
          <div className="absolute top-3 right-3">
            <Lock size={14} className="text-destructive" />
          </div>
        )}

        {user.use_pin && !locked && (
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
        )}

        {/* Avatar */}
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover mb-3 ring-2 ring-border" />
        ) : (
          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold mb-3 ${getInitialsColor(user.full_name)}`}>
            {getInitials(user.full_name)}
          </div>
        )}

        <p className="font-semibold text-sm text-foreground text-center truncate w-full">
          {user.full_name || user.username}
        </p>

        <div className={`mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium border flex items-center gap-1 ${ROLE_COLORS[user.role] || 'bg-muted text-muted-foreground border-border'}`}>
          <RoleIcon size={10} />
          {ROLE_LABELS[user.role] || user.role}
        </div>

        {isRecent && user.last_login && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock size={10} />
            {timeAgo(user.last_login)}
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      {/* Logo */}
      {(config?.logo || config?.theme?.logo) ? (
        <img src={config?.logo || config?.theme?.logo} alt="" className="h-12 mb-2 object-contain" />
      ) : null}
      <h1 className="text-2xl font-bold text-foreground mb-1">
        {config?.businessName || config?.business_name || 'CarthaPOS'}
      </h1>
      <p className="text-muted-foreground text-sm mb-8">Sélectionnez votre profil</p>

      {/* Search */}
      {showSearch && (
        <div className="w-full max-w-md mb-6 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-11 pl-10 pr-10 rounded-xl bg-card border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all"
          />
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current?.focus() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 w-full max-w-3xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center p-5 rounded-2xl border border-border/30 bg-card/40 animate-pulse">
              <div className="w-16 h-16 rounded-full bg-muted mb-3" />
              <div className="h-4 w-20 bg-muted rounded mb-2" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {!loading && (
        <div className="w-full max-w-3xl space-y-8">
          {/* Recent users */}
          {recentFiltered.length > 0 && !search && (
            <div>
              <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <Clock size={12} />
                Connexions récentes
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {recentFiltered.map((u) => renderUserCard(u, true))}
              </div>
            </div>
          )}

          {/* All users */}
          <div>
            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <User size={12} />
              {search ? 'Résultats' : 'Tous les utilisateurs'}
            </h2>
            {filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <User size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">
                  {search ? 'Aucun utilisateur trouvé' : 'Aucun utilisateur actif'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {filtered.map((u) => renderUserCard(u))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
