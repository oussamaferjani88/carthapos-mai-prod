/**
 * Script de Test - Vérification CSS dans POS Généré
 * 
 * Ce script vérifie que tous les fichiers nécessaires à la compilation
 * CSS/Tailwind sont présents dans un POS généré
 * 
 * Usage:
 *   node scripts/verify-pos-css.js <chemin-vers-pos-généré>
 * 
 * Exemple:
 *   node scripts/verify-pos-css.js ../generated-pos/pos-cafe-berber-xyz
 */

const fs = require('fs');
const path = require('path');

// Couleurs pour les logs
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, name, shouldContain = null) {
  const exists = fs.existsSync(filePath);
  
  if (!exists) {
    log(`❌ ${name} - MANQUANT`, 'red');
    return false;
  }
  
  if (shouldContain) {
    const content = fs.readFileSync(filePath, 'utf8');
    const containsAll = shouldContain.every(text => content.includes(text));
    
    if (!containsAll) {
      log(`⚠️  ${name} - EXISTE mais contenu incomplet`, 'yellow');
      shouldContain.forEach(text => {
        if (!content.includes(text)) {
          log(`   Manque: ${text}`, 'yellow');
        }
      });
      return false;
    }
  }
  
  log(`✅ ${name} - OK`, 'green');
  return true;
}

function verifyPOSCSS(posPath) {
  log('\n🔍 Vérification de la configuration CSS/Tailwind\n', 'cyan');
  log(`Dossier POS: ${posPath}\n`, 'blue');
  
  let allChecks = true;
  
  // 1. Vérifier postcss.config.js
  log('📦 Configuration PostCSS:', 'cyan');
  allChecks &= checkFile(
    path.join(posPath, 'postcss.config.js'),
    'postcss.config.js',
    ['@tailwindcss/postcss', 'autoprefixer'] // Tailwind v4
  );
  
  // 2. Vérifier tailwind.config.js
  log('\n🎨 Configuration Tailwind:', 'cyan');
  allChecks &= checkFile(
    path.join(posPath, 'tailwind.config.js'),
    'tailwind.config.js',
    ['content:', './src/**/*.{js,jsx,ts,tsx}']
  );
  
  // 3. Vérifier vite.config.js
  log('\n⚡ Configuration Vite:', 'cyan');
  allChecks &= checkFile(
    path.join(posPath, 'vite.config.js'),
    'vite.config.js',
    ['css:', 'postcss:', '@tailwindcss/postcss', 'cssCodeSplit'] // Tailwind v4
  );
  
  // 4. Vérifier src/index.css
  log('\n📄 Fichiers CSS:', 'cyan');
  allChecks &= checkFile(
    path.join(posPath, 'src', 'index.css'),
    'src/index.css',
    ['@import', 'complete.css']
  );
  
  // 5. Vérifier src/styles/complete.css
  allChecks &= checkFile(
    path.join(posPath, 'src', 'styles', 'complete.css'),
    'src/styles/complete.css',
    ['@tailwind base', '@tailwind components', '@tailwind utilities']
  );
  
  // 6. Vérifier package.json
  log('\n📦 Dépendances:', 'cyan');
  const packageJsonPath = path.join(posPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    
    // Vérifier @tailwindcss/postcss (Tailwind v4)
    const hasTailwindPostCSS = 
      packageJson.dependencies?.['@tailwindcss/postcss'] || 
      packageJson.devDependencies?.['@tailwindcss/postcss'];
    
    const hasAutoprefixer = 
      packageJson.dependencies?.autoprefixer || 
      packageJson.devDependencies?.autoprefixer;
    
    if (hasTailwindPostCSS) {
      log('✅ @tailwindcss/postcss (v4) - OK', 'green');
    } else {
      log('❌ @tailwindcss/postcss - MANQUANT dans package.json', 'red');
      allChecks = false;
    }
    
    if (hasAutoprefixer) {
      log('✅ autoprefixer - OK', 'green');
    } else {
      log('❌ autoprefixer - MANQUANT dans package.json', 'red');
      allChecks = false;
    }
  }
  
  // 7. Vérifier le dossier dist (si build déjà fait)
  log('\n🔨 Build (si disponible):', 'cyan');
  const distPath = path.join(posPath, 'dist');
  if (fs.existsSync(distPath)) {
    const distFiles = fs.readdirSync(distPath, { recursive: true });
    const cssFiles = distFiles.filter(f => f.toString().endsWith('.css'));
    
    if (cssFiles.length > 0) {
      log(`✅ ${cssFiles.length} fichier(s) CSS trouvé(s) dans dist/`, 'green');
      
      // Vérifier que le CSS contient du Tailwind compilé
      const firstCssFile = path.join(distPath, cssFiles[0]);
      const cssContent = fs.readFileSync(firstCssFile, 'utf8');
      
      // Chercher des classes Tailwind compilées
      const hasTailwindClasses = 
        cssContent.includes('.text-') || 
        cssContent.includes('.bg-') ||
        cssContent.includes('.flex') ||
        cssContent.includes('.grid');
      
      if (hasTailwindClasses) {
        log('✅ CSS compilé contient des classes Tailwind', 'green');
      } else {
        log('⚠️  CSS compilé ne semble pas contenir Tailwind', 'yellow');
        allChecks = false;
      }
    } else {
      log('⚠️  Aucun fichier CSS dans dist/', 'yellow');
    }
  } else {
    log('ℹ️  Dossier dist/ non trouvé (build pas encore fait)', 'blue');
  }
  
  // Résultat final
  log('\n' + '='.repeat(60), 'cyan');
  if (allChecks) {
    log('✅ SUCCÈS - Tous les fichiers CSS/Tailwind sont correctement configurés', 'green');
    log('➡️  Vous pouvez exécuter: npm install && npm run build:electron', 'blue');
    return 0;
  } else {
    log('❌ ÉCHEC - Certains fichiers ou configurations sont manquants', 'red');
    log('➡️  Vérifiez les logs ci-dessus et régénérez le POS', 'yellow');
    return 1;
  }
}

// Point d'entrée
const posPath = process.argv[2];

if (!posPath) {
  log('❌ Erreur: Chemin vers le POS généré requis', 'red');
  log('Usage: node verify-pos-css.js <chemin-vers-pos-généré>', 'blue');
  log('Exemple: node verify-pos-css.js ../generated-pos/pos-cafe-berber-xyz', 'blue');
  process.exit(1);
}

if (!fs.existsSync(posPath)) {
  log(`❌ Erreur: Dossier non trouvé: ${posPath}`, 'red');
  process.exit(1);
}

const exitCode = verifyPOSCSS(posPath);
process.exit(exitCode);
