/**
 * File Patcher - Handles patching of various files during POS generation
 * Extracted from the monolithic pos-generator.js for better debugging
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('FilePatcher');

class FilePatcher {
  constructor(projectPath) {
    this.projectPath = projectPath;
  }

  /**
   * Patch Dashboard.jsx to ensure proper card background classes
   */
  async patchDashboardComponent() {
    logger.info('Patching Dashboard.jsx for proper card styling');
    
    const dashboardPath = path.join(this.projectPath, 'src', 'pages', 'Dashboard.jsx');
    
    if (!fs.existsSync(dashboardPath)) {
      logger.warn('Dashboard.jsx not found, skipping patch');
      return;
    }

    let dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
    
    // Ensure all cards use bg-card class for proper theming
    const originalContent = dashboardContent;
    dashboardContent = dashboardContent.replace(
      /className="[^"]*bg-white[^"]*"/g,
      (match) => match.replace('bg-white', 'bg-card')
    );
    
    // Also fix any hardcoded background colors
    dashboardContent = dashboardContent.replace(
      /style=\{\{[^}]*backgroundColor:\s*['"][^'"]*['"][^}]*\}\}/g,
      ''
    );
    
    if (dashboardContent !== originalContent) {
      fs.writeFileSync(dashboardPath, dashboardContent);
      logger.info('Dashboard.jsx patched successfully');
    } else {
      logger.info('Dashboard.jsx already properly configured');
    }
  }

  /**
   * Fix Electron file: rename electron.cjs to electron.js if needed
   */
  async fixElectronFiles() {
    logger.info('Checking and fixing Electron file names');
    
    const electronCjsPath = path.join(this.projectPath, 'public', 'electron.cjs');
    const electronJsPath = path.join(this.projectPath, 'public', 'electron.js');
    
    if (fs.existsSync(electronCjsPath) && !fs.existsSync(electronJsPath)) {
      logger.info('Renaming electron.cjs to electron.js for production build');
      fs.renameSync(electronCjsPath, electronJsPath);
      logger.info('Electron file renamed successfully');
    } else {
      logger.info('Electron files already properly named');
    }
  }

  /**
   * Fix vite.config.js: ensure ESM config for type: "module"
   */
  async fixViteConfig() {
    logger.info('Ensuring vite.config.js is ESM for production build');
    
    const viteConfigPath = path.join(this.projectPath, 'vite.config.js');
    
    if (!fs.existsSync(viteConfigPath)) {
      logger.warn('vite.config.js not found, skipping conversion');
      return;
    }

    const esmViteConfig = this.generateESMViteConfig();
    fs.writeFileSync(viteConfigPath, esmViteConfig);
    logger.info('vite.config.js set to ESM successfully');
  }

  /**
   * Generate ESM Vite configuration
   */
  generateESMViteConfig() {
    return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import tailwindcss from '@tailwindcss/postcss';
import autoprefixer from 'autoprefixer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ESM version for production build with Tailwind CSS v4 support
export default defineConfig({
  base: './', // Use relative paths for Electron
  plugins: [
    react()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  css: {
    postcss: {
      plugins: [
        tailwindcss, // Tailwind CSS v4 PostCSS plugin
        autoprefixer
      ]
    }
  },
  build: {
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: false, // Bundle all CSS into single file for Electron
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom']
        }
      },
      onwarn() {
        // Suppress warnings during build
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
});`;
  }

  /**
   * Remove unnecessary files (like pnpm-lock.yaml)
   */
  async removeUnnecessaryFiles() {
    logger.info('Removing unnecessary files');
    
    const filesToRemove = [
      path.join(this.projectPath, 'pnpm-lock.yaml'),
      path.join(this.projectPath, '.env.example'),
      path.join(this.projectPath, 'README.dev.md')
    ];

    for (const filePath of filesToRemove) {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        logger.info(`Removed: ${path.basename(filePath)}`);
      }
    }
  }

  /**
   * Ensure preload.js is properly copied
   */
  async ensurePreloadFile() {
    logger.info('Ensuring preload.cjs is properly configured');
    
    const templatePath = path.join(__dirname, '..', '..', '..', 'pos-template');
    const preloadSourceCjsPath = path.join(templatePath, 'public', 'preload.cjs');
    const preloadSourceLegacyJsPath = path.join(templatePath, 'preload.js');

    const publicDir = path.join(this.projectPath, 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }

    const preloadDestPath = path.join(publicDir, 'preload.cjs');
    
    if (fs.existsSync(preloadDestPath)) {
      logger.info('public/preload.cjs already exists');
      return;
    }

    if (fs.existsSync(preloadSourceCjsPath)) {
      logger.info('Copying public/preload.cjs for Electron API');
      fs.copyFileSync(preloadSourceCjsPath, preloadDestPath);
      logger.info('preload.cjs copied successfully');
      return;
    }

    if (fs.existsSync(preloadSourceLegacyJsPath)) {
      logger.info('Copying legacy preload.js as public/preload.cjs for Electron API');
      fs.copyFileSync(preloadSourceLegacyJsPath, preloadDestPath);
      logger.info('preload.cjs created from legacy preload.js');
    } else {
      logger.warn('No preload source found in template; Electron API may be unavailable');
    }
  }

  /**
   * Ensure PostCSS configuration exists for Tailwind compilation
   */
  async ensurePostCSSConfig() {
    logger.info('Ensuring PostCSS configuration for Tailwind CSS');
    
    const postcssConfigPath = path.join(this.projectPath, 'postcss.config.js');
    
    if (!fs.existsSync(postcssConfigPath)) {
      logger.info('Creating postcss.config.js for Tailwind v4 compilation');
      const postcssConfig = `module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // Tailwind CSS v4
    autoprefixer: {},
  },
}
`;
      fs.writeFileSync(postcssConfigPath, postcssConfig);
      logger.info('postcss.config.js created successfully');
    } else {
      // Vérifier et mettre à jour si nécessaire
      const currentConfig = fs.readFileSync(postcssConfigPath, 'utf8');
      
      // Si l'ancien format tailwindcss est utilisé, le mettre à jour vers @tailwindcss/postcss
      if (currentConfig.includes('tailwindcss:') && !currentConfig.includes('@tailwindcss/postcss')) {
        logger.info('Updating postcss.config.js to use @tailwindcss/postcss (v4)');
        const updatedConfig = `module.exports = {
  plugins: {
    '@tailwindcss/postcss': {}, // Tailwind CSS v4
    autoprefixer: {},
  },
}
`;
        fs.writeFileSync(postcssConfigPath, updatedConfig);
        logger.info('postcss.config.js updated to Tailwind v4 format');
      } else {
        logger.info('postcss.config.js already exists with correct format');
      }
    }
  }

  /**
   * Ensure Tailwind configuration exists
   */
  async ensureTailwindConfig() {
    logger.info('Verifying Tailwind configuration');
    
    const tailwindConfigPath = path.join(this.projectPath, 'tailwind.config.js');
    
    if (!fs.existsSync(tailwindConfigPath)) {
      logger.warn('tailwind.config.js not found - this may cause CSS compilation issues');
      // Don't create it here, ThemeCustomizer/DependencyManager should handle this
    } else {
      logger.info('tailwind.config.js exists');
    }
  }

  /**
   * Ensure all required UI components are present
   */
  async ensureUIComponents() {
    logger.info('Ensuring all required UI components are present');
    
    const templateUIPath = path.join(__dirname, '..', '..', '..', 'pos-template', 'src', 'components', 'ui');
    const projectUIPath = path.join(this.projectPath, 'src', 'components', 'ui');
    
    // List of critical UI components that must exist
    const criticalComponents = [
      'dialog.jsx',
      'alert-dialog.jsx',
      'button.jsx',
      'card.jsx',
      'input.jsx',
      'label.jsx',
      'select.jsx',
      'badge.jsx',
      'textarea.jsx',
      'table.jsx',
      'dropdown-menu.jsx'
    ];
    
    // Ensure UI directory exists
    if (!fs.existsSync(projectUIPath)) {
      fs.mkdirSync(projectUIPath, { recursive: true });
      logger.info('Created UI components directory');
    }
    
    // Check and copy missing components
    let copiedCount = 0;
    for (const component of criticalComponents) {
      const sourcePath = path.join(templateUIPath, component);
      const destPath = path.join(projectUIPath, component);
      
      if (fs.existsSync(sourcePath) && !fs.existsSync(destPath)) {
        fs.copyFileSync(sourcePath, destPath);
        logger.debug(`Copied missing component: ${component}`);
        copiedCount++;
      }
    }
    
    if (copiedCount > 0) {
      logger.info(`Copied ${copiedCount} missing UI components`);
    } else {
      logger.info('All required UI components are present');
    }
  }

  /**
   * Apply all patches in the correct order
   */
  async applyAllPatches() {
    logger.info('Applying all file patches');
    
    try {
      await this.removeUnnecessaryFiles();
      await this.fixElectronFiles();
      await this.ensurePostCSSConfig();        // ✅ Ensure PostCSS config exists
      await this.ensureTailwindConfig();       // ✅ Verify Tailwind config
      await this.fixViteConfig();              // Fix Vite config (now includes PostCSS)
      await this.ensurePreloadFile();
      await this.ensureUIComponents();
      await this.patchDashboardComponent();
      
      logger.info('All file patches applied successfully');
    } catch (error) {
      logger.error('Error applying patches:', error);
      throw error;
    }
  }
}

module.exports = FilePatcher;
