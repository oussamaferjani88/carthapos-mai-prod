#!/usr/bin/env node

/**
 * Script de vérification rapide - Layout Migration
 * Vérifie que tous les fichiers sont corrects avant génération
 */

const fs = require('fs');
const path = require('path');

const TEMPLATE_PATH = path.join(__dirname, '..', 'pos-template');

console.log('🔍 Vérification de la migration du layout...\n');

let hasErrors = false;

// Test 1 : Vérifier la présence des nouveaux composants
console.log('📦 Test 1 : Présence des nouveaux composants');
const newComponents = [
  'src/components/POSHeader.jsx',
  'src/components/POSNavbar.jsx',
  'src/components/POSContent.jsx'
];

newComponents.forEach(comp => {
  const fullPath = path.join(TEMPLATE_PATH, comp);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${comp}`);
  } else {
    console.log(`  ❌ ${comp} - MANQUANT`);
    hasErrors = true;
  }
});

// Test 2 : Vérifier les imports dans Layout.jsx
console.log('\n📝 Test 2 : Imports dans Layout.jsx');
const layoutPath = path.join(TEMPLATE_PATH, 'src/components/Layout.jsx');
const layoutContent = fs.readFileSync(layoutPath, 'utf8');

const requiredImports = [
  { import: "import { POSHeader } from './POSHeader'", name: 'POSHeader' },
  { import: "import { POSNavbar } from './POSNavbar'", name: 'POSNavbar' },
  { import: "import { POSContent } from './POSContent'", name: 'POSContent' }
];

requiredImports.forEach(({ import: imp, name }) => {
  if (layoutContent.includes(imp)) {
    console.log(`  ✅ ${name} importé`);
  } else {
    console.log(`  ❌ ${name} - IMPORT MANQUANT`);
    hasErrors = true;
  }
});

// Test 3 : Vérifier l'utilisation des composants dans Layout.jsx
console.log('\n🔧 Test 3 : Utilisation des composants');
const componentUsage = [
  { usage: '<POSHeader', name: 'POSHeader' },
  { usage: '<POSNavbar', name: 'POSNavbar' },
  { usage: '<POSContent', name: 'POSContent' }
];

componentUsage.forEach(({ usage, name }) => {
  if (layoutContent.includes(usage)) {
    console.log(`  ✅ ${name} utilisé`);
  } else {
    console.log(`  ❌ ${name} - NON UTILISÉ`);
    hasErrors = true;
  }
});

// Test 4 : Vérifier les imports AuthContext
console.log('\n🔐 Test 4 : Imports AuthContext (pluriel)');
const componentsToCheck = [
  'src/components/POSHeader.jsx',
  'src/components/POSNavbar.jsx',
  'src/components/Layout.jsx'
];

componentsToCheck.forEach(comp => {
  const fullPath = path.join(TEMPLATE_PATH, comp);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // Vérifier le bon import (contexts avec s)
    if (content.includes("from '../contexts/AuthContext'") || !content.includes('AuthContext')) {
      console.log(`  ✅ ${comp}`);
    } else if (content.includes("from '../context/AuthContext'")) {
      console.log(`  ❌ ${comp} - Utilise 'context' au lieu de 'contexts'`);
      hasErrors = true;
    }
  }
});

// Test 5 : Vérifier l'ordre CSS dans complete.css
console.log('\n🎨 Test 5 : Ordre des imports CSS');
const cssPath = path.join(TEMPLATE_PATH, 'src/styles/complete.css');
const cssContent = fs.readFileSync(cssPath, 'utf8');

// Extraire les 20 premières lignes
const cssLines = cssContent.split('\n').slice(0, 20);
let importFound = false;
let tailwindFound = false;
let importAfterTailwind = false;

cssLines.forEach((line, index) => {
  if (line.includes('@import') && line.includes('./')) {
    importFound = true;
    if (tailwindFound) {
      importAfterTailwind = true;
    }
  }
  if (line.includes('@import') && line.includes('tailwindcss')) {
    tailwindFound = true;
  }
});

if (importFound && tailwindFound && !importAfterTailwind) {
  console.log('  ✅ @import custom.css et navbar-fix.css AVANT tailwindcss');
} else if (importAfterTailwind) {
  console.log('  ❌ @import après @import "tailwindcss" - ERREUR');
  hasErrors = true;
} else {
  console.log('  ✅ Ordre CSS correct');
}

// Test 6 : Vérifier Tailwind v4 syntax
console.log('\n⚡ Test 6 : Syntaxe Tailwind v4');
if (cssContent.includes('@import "tailwindcss"')) {
  console.log('  ✅ Utilise @import "tailwindcss" (v4)');
} else {
  console.log('  ❌ Syntaxe Tailwind v4 manquante');
  hasErrors = true;
}

if (cssContent.includes('@tailwind base') || cssContent.includes('@tailwind components')) {
  console.log('  ⚠️  Syntaxe Tailwind v3 détectée (@tailwind) - devrait utiliser v4');
  hasErrors = true;
} else {
  console.log('  ✅ Pas de syntaxe Tailwind v3 obsolète');
}

// Test 7 : Vérifier les classes CSS ajoutées
console.log('\n✨ Test 7 : Classes CSS modernes');
const cssClasses = [
  '.pos-glass-effect',
  '.pos-gradient-subtle',
  '.pos-shadow-medium',
  '.animation-slide',
  '.pos-notification-toast'
];

cssClasses.forEach(cssClass => {
  if (cssContent.includes(cssClass)) {
    console.log(`  ✅ ${cssClass}`);
  } else {
    console.log(`  ❌ ${cssClass} - MANQUANT`);
    hasErrors = true;
  }
});

// Résultat final
console.log('\n' + '='.repeat(50));
if (hasErrors) {
  console.log('❌ ERREURS DÉTECTÉES - Vérifier les fichiers ci-dessus');
  process.exit(1);
} else {
  console.log('✅ TOUS LES TESTS PASSÉS - Prêt pour la génération !');
  console.log('\n🚀 Vous pouvez maintenant générer un POS depuis l\'admin');
  process.exit(0);
}
