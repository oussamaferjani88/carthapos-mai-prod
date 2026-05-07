import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import path from 'path'
import { fileURLToPath } from 'url'
import { copyFileSync, mkdirSync, existsSync } from 'fs'
import { promises as fs } from 'fs'

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Optimized parallel file copying
async function copyFileAsync(source, destination) {
  return new Promise((resolve, reject) => {
    const readStream = require('fs').createReadStream(source);
    const writeStream = require('fs').createWriteStream(destination);
    
    readStream.on('error', reject);
    writeStream.on('error', reject);
    writeStream.on('finish', () => {
      console.log(`✅ Copied ${path.basename(source)} to dist/`);
      resolve();
    });
    
    readStream.pipe(writeStream);
  });
}

// Plugin to copy Electron files to dist with optimization
function copyElectronFiles() {
  return {
    name: 'copy-electron-files',
    async closeBundle() {
      const distDir = path.resolve(__dirname, 'dist')
      
      // Ensure dist exists
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true })
      }
      
      // Files to copy with their sources and destinations
      const filesToCopy = [
        { src: 'public/electron-modular.cjs', dest: 'dist/electron-modular.cjs' },
        { src: 'public/preload.cjs', dest: 'dist/preload.cjs' },
        { src: 'public/app-config.json', dest: 'dist/app-config.json' },
        { src: 'public/favicon.ico', dest: 'dist/favicon.ico' }
      ];

      // Copy files in parallel
      const copyTasks = filesToCopy
        .map(({ src, dest }) => {
          const srcPath = path.resolve(__dirname, src);
          const destPath = path.resolve(distDir, dest);
          
          if (existsSync(srcPath)) {
            return copyFileAsync(srcPath, destPath).catch(err => {
              console.warn(`⚠️ Could not copy ${src}:`, err.message);
              return null;
            });
          }
          return null;
        })
        .filter(Boolean);

      try {
        await Promise.all(copyTasks);
        console.log('✅ All Electron files copied successfully');
      } catch (error) {
        console.error('❌ Error copying files:', error);
      }
    }
  }
}

// Use PostCSS for Tailwind processing (better Electron compatibility)
export default defineConfig({
  base: './', // Fix for Electron relative paths
  plugins: [
    react({
      // Fast refresh optimization
      jsxImportSource: 'react',
      babel: {
        plugins: [
          // Add fast-refresh plugins for better development
          ['@babel/plugin-proposal-decorators', { legacy: true }]
        ]
      }
    }),
    copyElectronFiles() // Copy Electron files to dist after build
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
    // Optimize development server
    middlewareMode: false,
  },
  build: {
    // Optimizations for faster builds
    cssCodeSplit: false, // Bundle all CSS into single file for Electron
    sourcemap: false, // Disable sourcemaps for faster builds
    minify: 'terser', // Use terser for better minification
    terserOptions: {
      compress: {
        drop_console: true, // Remove console logs in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      },
      output: {
        // Manual chunks for better code splitting
        manualChunks: (id) => {
          // Split vendor packages into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            if (id.includes('react-router')) {
              return 'router-vendor';
            }
            return 'vendors';
          }
        }
      }
    },
    // Increase chunk size warning limit (Electron app doesn't need to be as optimized)
    chunkSizeWarningLimit: 2000,
    // Set output directory
    outDir: 'dist',
    // Keep asset names simple
    assetsDir: 'assets'
  },
  // Optimization settings
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu'
    ]
  }
})

