const BaseRepository = require('./BaseRepository');
const fs = require('fs');
const path = require('path');

class POSRepository extends BaseRepository {
  constructor() {
    super('license');
  }

  /**
   * Get license with full details for POS generation
   */
  async getLicenseForGeneration(licenseId) {
    return await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });
  }

  /**
   * Check if project path exists
   */
  projectExists(projectPath) {
    return fs.existsSync(projectPath);
  }

  /**
   * Get package.json from project
   */
  getPackageJson(projectPath) {
    const packageJsonPath = path.join(projectPath, 'package.json');
    
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error('package.json not found in project');
    }
    
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return { packageJson, packageJsonPath };
  }

  /**
   * Update package.json
   */
  updatePackageJson(packageJsonPath, packageJson) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  /**
   * Check if node_modules exists
   */
  nodeModulesExists(projectPath) {
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    return fs.existsSync(nodeModulesPath);
  }

  /**
   * Check if dist folder exists
   */
  distExists(projectPath) {
    const distPath = path.join(projectPath, 'dist');
    return fs.existsSync(distPath);
  }

  /**
   * Get dist folder contents
   */
  getDistContents(projectPath) {
    const distPath = path.join(projectPath, 'dist');
    
    if (!fs.existsSync(distPath)) {
      return [];
    }
    
    return fs.readdirSync(distPath);
  }

  /**
   * Find installer file in dist folder
   */
  findInstallerFile(projectPath) {
    const distPath = path.join(projectPath, 'dist');
    
    if (!fs.existsSync(distPath)) {
      return null;
    }
    
    const files = fs.readdirSync(distPath);
    
    // Priority 1: Look for Setup .exe installer
    const installerFile = files.find(file => 
      (file.includes('Setup') || file.includes('-Setup-')) && 
      file.endsWith('.exe')
    );
    
    if (installerFile) {
      return path.join(distPath, installerFile);
    }
    
    // Fallback 1: Any .exe in dist
    const anyExeFile = files.find(file => file.endsWith('.exe'));
    if (anyExeFile) {
      return path.join(distPath, anyExeFile);
    }
    
    // Fallback 2: Check win-unpacked folder
    const winUnpackedPath = path.join(distPath, 'win-unpacked');
    if (fs.existsSync(winUnpackedPath)) {
      const unpackedFiles = fs.readdirSync(winUnpackedPath);
      const exeFile = unpackedFiles.find(file => file.endsWith('.exe'));
      if (exeFile) {
        return path.join(winUnpackedPath, exeFile);
      }
    }
    
    return null;
  }

  /**
   * Get POS templates directory
   */
  getTemplatesPath() {
    return path.join(__dirname, '..', '..', '..', 'pos-template');
  }

  /**
   * Get all available POS templates
   */
  getTemplates() {
    const templatesPath = this.getTemplatesPath();
    
    if (!fs.existsSync(templatesPath)) {
      throw new Error('POS templates directory not found');
    }

    const templates = [];
    const templateDirs = fs.readdirSync(templatesPath);

    for (const dir of templateDirs) {
      const templatePath = path.join(templatesPath, dir);
      const templateConfigPath = path.join(templatePath, 'template.json');
      
      if (fs.existsSync(templateConfigPath)) {
        try {
          const templateConfig = JSON.parse(fs.readFileSync(templateConfigPath, 'utf8'));
          templates.push({
            id: dir,
            path: templatePath,
            ...templateConfig
          });
        } catch (parseError) {
          console.error(`Error parsing template config for ${dir}:`, parseError);
        }
      }
    }

    return templates;
  }

  /**
   * Get available business sectors
   */
  getSectors() {
    return [
      {
        id: 'restaurant',
        name: 'Restaurant',
        description: 'Gestion complète pour restaurants avec tables, commandes cuisine, etc.',
        defaultModules: ['pos-core', 'tables', 'kitchen', 'menu-management', 'takeaway', 'inventory', 'reports'],
        icon: '🍽️'
      },
      {
        id: 'cafe',
        name: 'Café / Bar',
        description: 'Solution adaptée aux cafés et bars avec gestion rapide des commandes',
        defaultModules: ['pos-core', 'inventory', 'reports'],
        icon: '☕'
      },
      {
        id: 'retail',
        name: 'Commerce de détail',
        description: 'Caisse pour magasins et boutiques avec gestion des stocks',
        defaultModules: ['pos-core', 'inventory', 'barcode', 'customer-management', 'promotions', 'reports'],
        icon: '🛍️'
      },
      {
        id: 'bakery',
        name: 'Boulangerie / Pâtisserie',
        description: 'Spécialisé pour boulangeries avec gestion des produits frais',
        defaultModules: ['pos-core', 'inventory', 'weight-scale', 'production', 'customer-management', 'reports'],
        icon: '🥖'
      },
      {
        id: 'pharmacy',
        name: 'Pharmacie',
        description: 'Solution pour pharmacies avec gestion des médicaments',
        defaultModules: ['pos-core', 'inventory', 'serial-batch', 'prescription', 'customer-management', 'reports'],
        icon: '💊'
      },
      {
        id: 'beauty',
        name: 'Salon de beauté',
        description: 'Gestion pour salons avec rendez-vous et services',
        defaultModules: ['pos-core', 'appointments', 'services', 'customer-management', 'reports'],
        icon: '💄'
      }
    ];
  }

  /**
   * Find installer in project directory (for download endpoint)
   */
  findInstallerInProject(projectPath) {
    const stats = fs.statSync(projectPath);
    const searchedPaths = [];

    // If it's a file, use it directly
    if (stats.isFile()) {
      return { installerPath: projectPath, searchedPaths };
    }

    // Search in multiple possible locations
    const searchLocations = [
      projectPath,
      path.join(projectPath, 'dist'),
      path.join(projectPath, 'out'),
      path.join(projectPath, 'release'),
      path.join(projectPath, 'build')
    ];

    for (const searchPath of searchLocations) {
      searchedPaths.push(searchPath);
      
      if (fs.existsSync(searchPath)) {
        const contents = fs.readdirSync(searchPath);
        
        // Look for installer files with common patterns
        const installerFile = contents.find(file => {
          const fileName = file.toLowerCase();
          return fileName.endsWith('.exe') && (
            fileName.includes('setup') ||
            fileName.includes('install') ||
            fileName.includes('installer') ||
            fileName.includes('-win') ||
            fileName.includes('windows')
          );
        });
        
        if (installerFile) {
          return { 
            installerPath: path.join(searchPath, installerFile), 
            searchedPaths 
          };
        }
        
        // Fallback: look for any .exe file that's not in win-unpacked
        const exeFile = contents.find(file => 
          file.endsWith('.exe') && !searchPath.includes('win-unpacked')
        );
        if (exeFile) {
          return { 
            installerPath: path.join(searchPath, exeFile), 
            searchedPaths 
          };
        }
      }
    }

    return { installerPath: null, searchedPaths };
  }
}

module.exports = new POSRepository();
