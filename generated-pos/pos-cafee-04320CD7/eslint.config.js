import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  {
    ignores: [
      'dist',
      // Legacy electron main files we don't lint anymore
      'public/electron.js',
      'public/electron.cjs'
    ]
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  },
  // Node/Electron files (main process, preload, handlers, config files)
  {
    files: [
      'public/*.cjs',
      'public/preload.js',
      'preload.js',
      'src/electron/**/*.js',
      'vite.config.*',
      'postcss.config.*',
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.node },
      parserOptions: { sourceType: 'commonjs' }
    },
    rules: {
      ...js.configs.recommended.rules,
      // Allow CommonJS style in Node/Electron files
      'no-undef': 'off'
    }
  },
  // Relax unused var rules for pages with incomplete/WIP features
  {
    files: [
      'src/pages/**/*.jsx',
      'src/components/POSWithAuth.jsx',
      'src/components/UserManagementAdvanced.jsx',
      'src/lib/**/*.js',
      'src/hooks/use-toast.js'
    ],
    rules: {
      'no-unused-vars': 'warn', // downgrade to warning for WIP code
    }
  }
]
