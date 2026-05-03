/**
 * Tailwind Configuration Manager
 * Handles Tailwind CSS configuration and patching
 */

const fs = require('fs');
const path = require('path');
const { createLogger } = require('../common/logger');

const logger = createLogger('TailwindConfigManager');

class TailwindConfigManager {
  constructor(projectPath, themeConfig) {
    this.projectPath = projectPath;
    this.themeConfig = themeConfig;
  }

  /**
   * Fix tailwind.config.js for proper card color mapping
   */
  async fixTailwindConfig() {
    logger.info('Fixing Tailwind configuration for card colors');
    
    const tailwindConfigPath = path.join(this.projectPath, 'tailwind.config.js');
    
    if (!fs.existsSync(tailwindConfigPath)) {
      logger.warn('tailwind.config.js not found, creating new one');
      await this.createTailwindConfig();
      return;
    }

    let tailwindConfig = fs.readFileSync(tailwindConfigPath, 'utf8');
    
    // Add card color mappings to the config
    const cardColorMappings = this.generateCardColorMappings();
    
    // Insert the card color mappings into the colors section
    if (tailwindConfig.includes('colors: {')) {
      tailwindConfig = tailwindConfig.replace(
        /colors: \{/,
        `colors: {${cardColorMappings}`
      );
    } else {
      // If no colors section exists, add it to the theme.extend
      tailwindConfig = tailwindConfig.replace(
        /theme: \{[\s\S]*?extend: \{/,
        `theme: {
        extend: {
          colors: {${cardColorMappings}
          },`
      );
    }
    
    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    logger.info('Tailwind configuration updated successfully');
  }

  /**
   * Generate card color mappings for Tailwind
   */
  generateCardColorMappings() {
    return `
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
        border: 'var(--color-border)',`;
  }

  /**
   * Update Tailwind configuration with theme colors
   * This method is called by ThemeCustomizer
   */
  updateTailwindConfig(theme) {
    logger.debug('Updating Tailwind configuration with theme:', theme);
    
    // Store theme for later use
    this.themeConfig = theme;
    
    // Create or update the Tailwind config
    this.createTailwindConfigWithTheme(theme);
  }

  /**
   * Create new Tailwind configuration
   */
  async createTailwindConfig() {
    const tailwindConfigPath = path.join(this.projectPath, 'tailwind.config.js');
    
    const cardColorMappings = this.generateCardColorMappings();
    
    // POSConfiguration safelist - CRITICAL for generated POS styling
    const safelist = `[
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
  ]`;
    
    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {${cardColorMappings}
      }
    },
  },
  safelist: ${safelist},
  plugins: [],
}`;

    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    logger.info('New Tailwind configuration created');
  }

  /**
   * Create Tailwind configuration with custom theme
   */
  createTailwindConfigWithTheme(theme) {
    const tailwindConfigPath = path.join(this.projectPath, 'tailwind.config.js');
    
    const cardColorMappings = this.generateCardColorMappings();
    
    // Use the same card color mappings for consistency
    const customColors = cardColorMappings;

    // POSConfiguration safelist - CRITICAL for generated POS styling
    const safelist = `[
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
  ]`;

    const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {${customColors}
      },
      fontFamily: {
        sans: ['${theme.customFont || 'Inter'}', 'ui-sans-serif', 'system-ui']
      }
    },
  },
  safelist: ${safelist},
  plugins: [],
}`;

    fs.writeFileSync(tailwindConfigPath, tailwindConfig);
    logger.info('Tailwind configuration created with custom theme');
  }

  /**
   * Note: Removed patchCompleteCSS method to preserve Tailwind v4 syntax
   * The template now uses @import "tailwindcss"; which is the correct v4 syntax
   */

  /**
   * Ensure Tailwind directives are present in CSS files
   */
  async ensureTailwindDirectives() {
    // Only add directives to complete.css, not index.css
    const completeCssFile = path.join(this.projectPath, 'src', 'styles', 'complete.css');
    
    if (fs.existsSync(completeCssFile)) {
      let content = fs.readFileSync(completeCssFile, 'utf8');
      
      if (!content.includes('@tailwind base;')) {
        const tailwindDirectives = `@tailwind base;
@tailwind components;
@tailwind utilities;

`;
        content = tailwindDirectives + content;
        fs.writeFileSync(completeCssFile, content);
        logger.info(`Tailwind directives added to ${path.basename(completeCssFile)}`);
      }
    }

    // Ensure index.css has the correct import structure
    const indexCssFile = path.join(this.projectPath, 'src', 'index.css');
    if (fs.existsSync(indexCssFile)) {
      let content = fs.readFileSync(indexCssFile, 'utf8');
      
      // If index.css doesn't have the complete.css import, add it
      if (!content.includes("@import './styles/complete.css';")) {
        // If it has old Tailwind directives directly, remove them and add the import
        content = content.replace(/@tailwind base;\s*@tailwind components;\s*@tailwind utilities;\s*/g, '');
        content = content.replace(/@import "tailwindcss";\s*/g, '');
        
        // Add the import at the top (after any existing custom variables)
        // Always put imports at the very beginning, regardless of custom variables
        content = "/* POS Template - Main CSS Import */\n@import './styles/complete.css';\n\n" + content;
        
        fs.writeFileSync(indexCssFile, content);
        logger.info(`CSS import structure fixed in ${path.basename(indexCssFile)}`);
      }
    }
  }
}

module.exports = TailwindConfigManager;
