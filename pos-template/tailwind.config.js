/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Couleurs dynamiques via CSS variables - exactement comme dans l'admin
        primary: 'var(--color-primary, #3B82F6)',
        'primary-foreground': 'var(--color-primary-foreground, #FFFFFF)',
        secondary: 'var(--color-secondary, #6B7280)',
        'secondary-foreground': 'var(--color-secondary-foreground, #FFFFFF)',
        accent: 'var(--color-accent, #10B981)',
        'accent-foreground': 'var(--color-accent-foreground, #FFFFFF)',
        background: 'var(--color-background, #FFFFFF)',
        'card-background': 'var(--color-card-background, #F9FAFB)',
        'text-main': 'var(--color-text, #111827)',
        'text-muted': 'var(--color-text-muted, #6B7280)',
        'border-main': 'var(--color-border, #E5E7EB)',
        
        // Support des couleurs Tailwind standards pour compatibilité
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
        },
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        green: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#22c55e',
          600: '#16a34a',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          500: '#f97316',
          600: '#ea580c',
        },
        red: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        purple: {
          50: '#faf5ff',
          100: '#f3e8ff',
          500: '#a855f7',
          600: '#9333ea',
        }
      },
      spacing: {
        'dynamic': 'calc(var(--spacing-scale, 1) * 1rem)',
      },
      borderRadius: {
        'dynamic': 'var(--border-radius, 0.5rem)',
      },
      fontFamily: {
        'dynamic': ['var(--font-family, Inter)', 'sans-serif'],
      },
      fontSize: {
        'dynamic': 'var(--font-size, 14px)',
      },
      maxWidth: {
        'dynamic': 'var(--max-width, 1200px)',
      }
    },
  },
  safelist: [
    // POSConfiguration dynamic classes - CRITICAL for generated POS styling
    'rounded-none', 'rounded', 'rounded-lg', 'rounded-xl', 'rounded-2xl', 'rounded-full',
    'shadow-sm', 'shadow', 'shadow-lg', 'shadow-xl', 'shadow-2xl',
    'shadow-blue-200', 'shadow-gray-200',
    'p-1', 'p-2', 'p-3', 'p-4', 'p-5', 'p-6', 'p-8',
    'px-2', 'px-3', 'px-4', 'px-6', 'px-8', 'py-1', 'py-2', 'py-3', 'py-4',
    'text-xs', 'text-sm', 'text-base', 'text-lg',
    'bg-primary', 'text-primary', 'text-primary-foreground', 'border-primary',
    'bg-transparent', 'hover:bg-primary/10', 'hover:opacity-90',
    'transition-all', 'duration-100', 'duration-200', 'duration-300',
    'grid-cols-2', 'grid-cols-3', 'grid-cols-4', 'grid-cols-5', 'grid-cols-6',
    'gap-2', 'gap-3', 'gap-4', 'gap-6', 'gap-8',
    'space-y-2', 'space-y-4', 'space-y-6', 'space-y-8',
    'max-w-full', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl',
    'mx-auto', 'border-0', 'border', 'border-2', 'border-b', 'border-gray-300',
    'focus:ring-2', 'focus:ring-primary', 'focus:border-primary',
    'bg-gray-100', 'border-gray-200', 'bg-gray-50'
  ],
  plugins: [],
}
