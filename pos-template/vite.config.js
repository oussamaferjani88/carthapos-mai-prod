import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, existsSync } from 'fs'

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Plugin to copy Electron files to dist
function copyElectronFiles() {
  return {
    name: 'copy-electron-files',
    closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      
      // Ensure dist exists
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }
      
      // Copy electron-modular.cjs
      const electronSrc = path.resolve(__dirname, 'public/electron-modular.cjs')
      const electronDest = path.resolve(distDir, 'electron-modular.cjs')
      if (existsSync(electronSrc)) {
        copyFileSync(electronSrc, electronDest)
        console.log('✅ Copied electron-modular.cjs to dist/')
      }
      
      // Copy preload.js
      const preloadSrc = path.resolve(__dirname, 'public/preload.js')
      const preloadDest = path.resolve(distDir, 'preload.js')
      if (existsSync(preloadSrc)) {
        copyFileSync(preloadSrc, preloadDest)
        console.log('✅ Copied preload.js to dist/')
      }
      
      // Copy app-config.json
      const configSrc = path.resolve(__dirname, 'public/app-config.json')
      const configDest = path.resolve(distDir, 'app-config.json')
      if (existsSync(configSrc)) {
        copyFileSync(configSrc, configDest)
        console.log('✅ Copied app-config.json to dist/')
      }
    }
  }
}

// Use PostCSS for Tailwind processing (better Electron compatibility)
export default defineConfig({
  base: './', // Fix for Electron relative paths
  plugins: [
    react(),
    copyElectronFiles() // Copy Electron files to dist after build
    // Removed @tailwindcss/vite plugin - using PostCSS instead
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss,
        autoprefixer
      ]
    }
  },
  server: {
    hmr: { 
      overlay: false 
    },
  },
  build: {
    cssCodeSplit: false, // Bundle all CSS into single file for Electron
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      }
    }
  }
})
