import { useState, useRef, useEffect, useCallback } from 'react'
import { ArrowLeft, Delete, Check, Loader2, Eye, EyeOff, ArrowUp } from 'lucide-react'

const LAYOUTS = {
  lower: [
    ['a','z','e','r','t','y','u','i','o','p'],
    ['q','s','d','f','g','h','j','k','l'],
    ['m','w','x','c','v','b','n'],
  ],
  upper: [
    ['A','Z','E','R','T','Y','U','I','O','P'],
    ['Q','S','D','F','G','H','J','K','L'],
    ['M','W','X','C','V','B','N'],
  ],
  numbers: [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['@','#','$','%','&','*','-','+','='],
    ['.',',','(',')','!',':',';','\''],
  ],
  symbols: [
    ['~','`','|','^','°','{','}','[',']'],
    ['\\','/','<','>','?','_','=','¥','€'],
    ['£','©','™','®','§','¶','¿','¡'],
  ],
}

const TABS = [
  { id: 'lower', label: 'ABC' },
  { id: 'numbers', label: '123' },
  { id: 'symbols', label: '#+=' },
]

export default function AuthKeyboard({ onSubmit, onBack, error, loading, userName }) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [layout, setLayout] = useState('lower')
  const [shift, setShift] = useState(false)
  const [shake, setShake] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (error) {
      setShake(true)
      const t = setTimeout(() => { setShake(false); setPassword('') }, 600)
      return () => clearTimeout(t)
    }
  }, [error])

  const handleKey = useCallback((key) => {
    if (loading) return
    if (key === 'SHIFT') { setShift(s => !s); return }
    if (key === '⌫') { setPassword(p => p.slice(0, -1)); return }
    if (key === 'ESPACE') { setPassword(p => p + ' '); return }
    const char = shift ? key.toUpperCase() : key.toLowerCase()
    setPassword(p => p + char)
    if (shift) setShift(false)
  }, [loading, shift])

  const confirm = useCallback(() => {
    if (loading || password.length < 1) return
    onSubmit(password)
  }, [loading, password, onSubmit])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirm() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [confirm])

  const currentLayout = shift ? LAYOUTS.upper : LAYOUTS[layout]

  return (
    <div className="flex flex-col items-center w-full max-w-sm mx-auto">
      {userName && (
        <p className="text-sm text-muted-foreground mb-3 text-center">
          Connexion en tant que <span className="font-semibold text-foreground">{userName}</span>
        </p>
      )}

      {/* Password field */}
      <div className="w-full mb-4">
        <div className={`relative ${shake ? 'animate-shake' : ''}`}>
          <input
            ref={inputRef}
            type={showPassword ? 'text' : 'password'}
            value={password}
            readOnly
            placeholder="Tapez votre mot de passe..."
            className="w-full h-12 px-4 pr-20 rounded-xl bg-background border border-border/50 text-sm text-center focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all tracking-wider"
          />
          <button
            type="button"
            onClick={() => setShowPassword(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {error && (
          <p className="text-sm text-destructive text-center mt-2 min-h-[20px]">{error}</p>
        )}
        {!error && <div className="h-[28px]" />}
      </div>

      {/* Keyboard */}
      <div className="w-full space-y-1.5">
        {/* Layout tabs */}
        <div className="flex gap-1 mb-2">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setLayout(tab.id); setShift(false) }}
              className={`flex-1 h-8 rounded-lg text-xs font-semibold transition-all ${
                layout === tab.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Key rows */}
        {currentLayout.map((row, ri) => (
          <div key={`${layout}-${ri}`} className="flex justify-center gap-1">
            {ri === 2 && (
              <button
                onClick={() => handleKey('SHIFT')}
                disabled={loading}
                className={`h-11 rounded-xl flex items-center justify-center px-3 transition-all active:scale-95 disabled:opacity-30 ${
                  shift ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <ArrowUp size={16} />
              </button>
            )}
            {row.map(key => (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={loading}
                className="h-11 min-w-[32px] flex-1 rounded-xl bg-card border border-border/30 text-sm font-medium hover:bg-muted/40 active:scale-95 transition-all shadow-sm disabled:opacity-30"
              >
                {shift ? key.toUpperCase() : (layout === 'lower' ? key.toLowerCase() : key)}
              </button>
            ))}
            {ri === 2 && (
              <button
                onClick={() => handleKey('⌫')}
                disabled={loading || password.length === 0}
                className="h-11 rounded-xl flex items-center justify-center px-3 bg-muted/50 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all active:scale-95 disabled:opacity-30"
              >
                <Delete size={16} />
              </button>
            )}
          </div>
        ))}

        {/* Space + Enter row */}
        <div className="flex gap-1.5 mt-2">
          <button
            onClick={() => handleKey('ESPACE')}
            disabled={loading}
            className="h-11 flex-1 rounded-xl bg-muted/30 text-muted-foreground text-xs font-medium hover:bg-muted/50 active:scale-[0.98] transition-all disabled:opacity-30"
          >
            Espace
          </button>
          <button
            onClick={confirm}
            disabled={loading || password.length < 1}
            className="h-11 flex-1 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-1.5 hover:bg-primary/90 active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-40"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <><Check size={18} /> Entrer</>}
          </button>
        </div>
      </div>

      <button
        onClick={onBack}
        disabled={loading}
        className="mt-4 text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors disabled:opacity-40"
      >
        <ArrowLeft size={14} />
        Choisir un autre utilisateur
      </button>
    </div>
  )
}
