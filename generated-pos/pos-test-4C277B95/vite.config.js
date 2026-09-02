import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import { promises as fs } from 'fs';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Copy Electron files to dist after build
function copyElectronFiles() {
  return {
    name: 'copy-electron-files',
    async closeBundle() {
      const distDir = path.resolve(__dirname, 'dist');
      if (!existsSync(distDir)) {
        mkdirSync(distDir, { recursive: true });
      }
      const files = [
        { src: 'public/electron-modular.cjs', dest: 'electron-modular.cjs' },
        { src: 'public/preload.cjs', dest: 'preload.cjs' },
        { src: 'public/app-config.json', dest: 'app-config.json' },
        { src: 'public/favicon.ico', dest: 'favicon.ico' }
      ];
      const tasks = files
        .filter(({ src }) => existsSync(path.resolve(__dirname, src)))
        .map(({ src, dest }) => {
          const srcPath = path.resolve(__dirname, src);
          const destPath = path.resolve(distDir, dest);
          return fs.copyFile(srcPath, destPath);
        });
      await Promise.all(tasks);
      console.log('Electron files copied to dist/');
    }
  };
}

// ESM version for production build with Tailwind CSS v4 support
export default defineConfig({
  base: './',
  plugins: [
    react(),
    copyElectronFiles()
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
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      },
      onwarn() {
        return;
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  },
  server: {
    port: 5173,
    host: true,
    hmr: {
      overlay: false
    }
  }
});