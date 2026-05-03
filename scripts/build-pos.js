#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

/**
 * Script de génération d'application POS personnalisée
 * 
 * Ce script prend une configuration de licence et génère une application
 * POS Electron personnalisée avec les modules et thèmes appropriés.
 */

class POSBuilder {
  constructor() {
    this.templateDir = path.join(__dirname, '../pos-template');
    this.outputDir = path.join(__dirname, '../generated-pos');
    this.tempDir = path.join(__dirname, '../temp-build');
  }

  /**
   * Génère une application POS personnalisée
   * @param {Object} config - Configuration de l'application
   * @param {Object} license - Données de licence
   * @param {string} outputPath - Chemin de sortie
   */
  async generatePOS(config, license, outputPath) {
    console.log('🚀 Début de la génération du POS personnalisé...');
    
    try {
      // 1. Créer le dossier temporaire
      this.createTempDirectory();
      
      // 2. Copier le template
      this.copyTemplate();
      
      // 3. Personnaliser la configuration
      this.customizeConfig(config, license);
      
      // 4. Mettre à jour le package.json
      this.updatePackageJson(config);
      
      // 5. Installer les dépendances
      this.installDependencies();
      
      // 6. Builder l'application
      this.buildApplication();
      
      // 7. Packager avec Electron
      await this.packageElectron(outputPath);
      
      // 8. Nettoyer les fichiers temporaires
      this.cleanup();
      
      console.log('✅ Génération terminée avec succès !');
      console.log(`📦 Application générée dans: ${outputPath}`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la génération:', error);
      this.cleanup();
      throw error;
    }
  }

  createTempDirectory() {
    console.log('📁 Création du dossier temporaire...');
    
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(this.tempDir, { recursive: true });
  }

  copyTemplate() {
    console.log('📋 Copie du template...');
    
    this.copyRecursive(this.templateDir, this.tempDir);
  }

  copyRecursive(src, dest) {
    const stats = fs.statSync(src);
    
    if (stats.isDirectory()) {
      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }
      
      const files = fs.readdirSync(src);
      for (const file of files) {
        // Ignorer node_modules et dist
        if (file === 'node_modules' || file === 'dist') continue;
        
        this.copyRecursive(
          path.join(src, file),
          path.join(dest, file)
        );
      }
    } else {
      fs.copyFileSync(src, dest);
    }
  }

  customizeConfig(config, license) {
    console.log('⚙️ Personnalisation de la configuration...');
    
    // Update the template config file
    const configPath = path.join(this.tempDir, 'src/config/app-config.json');
    const appConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    
    // Also create config in public folder for Electron dev mode
    const publicConfigPath = path.join(this.tempDir, 'public/app-config.json');
    
    // Mettre à jour la configuration avec les données personnalisées
    appConfig.license = license;
    appConfig.theme = {
      ...appConfig.theme,
      ...config.theme
    };
    
    // Activer/désactiver les modules selon la licence
    if (license.modules) {
      appConfig.modules = appConfig.modules.map(module => {
        const licenseModule = license.modules.find(lm => lm.name === module.name);
        return {
          ...module,
          isEnabled: licenseModule ? licenseModule.isEnabled : false
        };
      });
    }
    
    // Write config to both locations
    fs.writeFileSync(configPath, JSON.stringify(appConfig, null, 2));
    fs.writeFileSync(publicConfigPath, JSON.stringify(appConfig, null, 2));
    
    console.log('📋 Configuration saved with business name:', config.theme?.businessName);
    
    // Mettre à jour le titre dans index.html
    const indexPath = path.join(this.tempDir, 'index.html');
    let indexContent = fs.readFileSync(indexPath, 'utf8');
    indexContent = indexContent.replace(
      '<title>POS System</title>',
      `<title>${config.theme.businessName || 'POS System'}</title>`
    );
    fs.writeFileSync(indexPath, indexContent);
  }

  updatePackageJson(config) {
    console.log('📦 Mise à jour du package.json...');
    
    const packagePath = path.join(this.tempDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
    
    // Personnaliser les informations de l'application
    packageJson.name = this.sanitizeName(config.theme.businessName || 'pos-system');
    packageJson.productName = config.theme.businessName || 'POS System';
    packageJson.description = `Système POS pour ${config.theme.businessName || 'votre commerce'}`;
    
    // Mettre à jour la configuration electron-builder
    if (packageJson.build) {
      packageJson.build.productName = config.theme.businessName || 'POS System';
      packageJson.build.appId = `com.pos-system.${this.sanitizeName(config.theme.businessName || 'app')}`;
    }
    
    fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2));
  }

  sanitizeName(name) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  installDependencies() {
    console.log('📥 Installation des dépendances...');
    
    try {
      execSync('pnpm install', {
        cwd: this.tempDir,
        stdio: 'inherit'
      });
    } catch (error) {
      console.log('⚠️ pnpm non disponible, utilisation de npm...');
      execSync('npm install', {
        cwd: this.tempDir,
        stdio: 'inherit'
      });
    }
  }

  buildApplication() {
    console.log('🔨 Build de l\'application React...');
    
    execSync('npm run build', {
      cwd: this.tempDir,
      stdio: 'inherit'
    });
    
    // Copy app-config.json to dist folder for production
    console.log('📋 Copying config to dist folder...');
    const publicConfigPath = path.join(this.tempDir, 'public/app-config.json');
    const distConfigPath = path.join(this.tempDir, 'dist/app-config.json');
    
    if (fs.existsSync(publicConfigPath)) {
      fs.copyFileSync(publicConfigPath, distConfigPath);
      console.log('✅ Config copied to dist folder');
    } else {
      console.warn('⚠️ No config found in public folder');
    }
  }

  async packageElectron(outputPath) {
    console.log('📦 Packaging Electron...');
    
    // Créer le dossier de sortie s'il n'existe pas
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath, { recursive: true });
    }
    
    // Utiliser electron-builder pour packager
    execSync(`npm run build:electron -- --publish=never --dir`, {
      cwd: this.tempDir,
      stdio: 'inherit'
    });
    
    // Copier le résultat vers le dossier de sortie
    const distPath = path.join(this.tempDir, 'dist');
    if (fs.existsSync(distPath)) {
      this.copyRecursive(distPath, outputPath);
    }
  }

  cleanup() {
    console.log('🧹 Nettoyage des fichiers temporaires...');
    
    if (fs.existsSync(this.tempDir)) {
      fs.rmSync(this.tempDir, { recursive: true, force: true });
    }
  }
}

// Fonction utilitaire pour utilisation en ligne de commande
async function buildFromConfig(configFile, outputDir) {
  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const builder = new POSBuilder();
  
  await builder.generatePOS(
    config.appConfig,
    config.license,
    outputDir
  );
}

// Export pour utilisation en module
module.exports = { POSBuilder, buildFromConfig };

// Utilisation en ligne de commande
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: node build-pos.js <config-file> <output-directory>');
    console.log('');
    console.log('Exemple:');
    console.log('  node build-pos.js ./config/restaurant-config.json ./output/restaurant-pos');
    process.exit(1);
  }
  
  const [configFile, outputDir] = args;
  
  buildFromConfig(configFile, outputDir)
    .then(() => {
      console.log('🎉 Build terminé avec succès !');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Erreur:', error.message);
      process.exit(1);
    });
}

// Export the class for use in other modules
module.exports = { POSBuilder };

