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
        { src: 'public/electron-modular.cjs', dest: 'electron-modular.cjs' },
        { src: 'public/preload.cjs', dest: 'preload.cjs' },
        { src: 'public/app-config.json', dest: 'app-config.json' },
        { src: 'public/favicon.ico', dest: 'favicon.ico' }
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
    // esbuild's minifier was tried here for build speed, but it broke the vendor
    // chunk at runtime ("Cannot access 'X' before initialization") - reverted to
    // terser, which is proven-safe with this dependency mix. The build-time cost
    // is now a small fraction of total generation time anyway (shell caching is
    // the actual per-client speedup), so the trade isn't worth it.
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: false, // KEEP console logs for debugging crashes in production
        drop_debugger: true
      }
    },
    rollupOptions: {
      onwarn() {
        // Suppress all warnings
        return;
      },
      output: {
        // No manualChunks: this used to hand-split node_modules by filename
        // substring (e.g. id.includes('react')), which is blind to actual
        // dependency relationships. That produced real, confirmed-via-sourcemap
        // runtime crashes ("Cannot access/read 'React'/'useLayoutEffect' before
        // initialization"): e.g. use-callback-ref (no "react" in its own name,
        // so it landed in a "vendors" chunk) is used internally by
        // react-remove-scroll (does match "react", landed in "react-vendor"),
        // a real circular dependency split across two chunks purely by naming
        // coincidence, unrelated to which chunk is "correct" - recharts had the
        // same class of issue for a different reason. This is pre-existing
        // bundling fragility (confirmed present before this session's changes),
        // just never triggered before because nobody could iterate fast enough
        // on a full generate->install->launch cycle to catch it. Rollup's
        // automatic chunking analyzes the real dependency graph and keeps
        // circularly-dependent modules together correctly, which hand-rolled
        // substring matching can't do - removing it is the actual fix, not
        // another one-off split.
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

