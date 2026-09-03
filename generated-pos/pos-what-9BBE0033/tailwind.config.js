/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        card: {
          DEFAULT: 'var(--color-card-background)',
          foreground: 'var(--color-text)'
        },
        'card-foreground': 'var(--color-text)',
        'muted-foreground': 'var(--color-text-muted)',
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground, #ffffff)'
        },
        'primary-foreground': 'var(--color-primary-foreground, #ffffff)',
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground, #ffffff)'
        },
        'secondary-foreground': 'var(--color-secondary-foreground, #ffffff)',
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground, #ffffff)'
        },
        'accent-foreground': 'var(--color-accent-foreground, #ffffff)',
        background: 'var(--color-background)',
        border: 'var(--color-border)',
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