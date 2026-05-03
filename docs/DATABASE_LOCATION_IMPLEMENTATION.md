# 📊 Implémentation de l'Emplacement de Base de Données Portable

## 🎯 Objectif
Déplacer la base de données SQLite de `%APPDATA%` vers le dossier d'installation du POS avec :
- **Base de données principale** : `{InstallDir}\data\{BusinessName}.db` (portable)
- **Sauvegardes automatiques** : `%APPDATA%\{BusinessName}\backups\` (sécurisé)
- **Nom unique** : Chaque POS a sa propre base de données nommée d'après le nom du commerce

## 🔧 Modifications Effectuées

### 1. **ElectronDatabaseManager.js** ✅
**Fichier** : `pos-template/src/electron/ElectronDatabaseManager.js`

**Nouvelles méthodes ajoutées** :

#### a) Lecture de la Configuration
```javascript
getBusinessNameFromConfig() {
  const configPath = path.join(this.getAppInstallPath(), 'resources', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  return config.businessName || 'CarthaposDB';
}
```

#### b) Nettoyage du Nom de Commerce
```javascript
sanitizeDbName(name) {
  return name
    .replace(/[^a-zA-Z0-9\s-]/g, '') // Supprimer caractères spéciaux
    .replace(/\s+/g, '_')             // Espaces → underscores
    .replace(/-+/g, '_')              // Tirets → underscores
    .substring(0, 50)                 // Limiter longueur
    || 'CarthaposDB';                 // Fallback
}
```

#### c) Chemins d'Installation et AppData
```javascript
getAppInstallPath() {
  const { app } = require('electron');
  return app.getAppPath(); // Dossier d'installation
}

getAppDataPath() {
  const { app } = require('electron');
  return app.getPath('userData'); // %APPDATA%\Roaming\{app-name}
}
```

#### d) Chemin de Sauvegarde
```javascript
getBackupPath() {
  const businessName = this.getBusinessNameFromConfig();
  const sanitizedName = this.sanitizeDbName(businessName);
  return path.join(this.getAppDataPath(), sanitizedName, 'backups');
}
```

#### e) Création de Sauvegardes Automatiques
```javascript
async createBackup(reason = 'manual') {
  const backupDir = this.getBackupPath();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const businessName = this.sanitizeDbName(this.getBusinessNameFromConfig());
  const backupFileName = `${businessName}_${reason}_${timestamp}.db`;
  const backupPath = path.join(backupDir, backupFileName);
  
  fs.copyFileSync(this.dbPath, backupPath);
  this.cleanOldBackups(backupDir, 10); // Garder seulement les 10 dernières
  
  return backupPath;
}
```

#### f) Rotation des Sauvegardes
```javascript
cleanOldBackups(backupDir, keepCount = 10) {
  const files = fs.readdirSync(backupDir)
    .filter(f => f.endsWith('.db'))
    .map(f => ({
      name: f,
      path: path.join(backupDir, f),
      time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  
  // Supprimer les anciennes sauvegardes
  if (files.length > keepCount) {
    files.slice(keepCount).forEach(file => {
      fs.unlinkSync(file.path);
    });
  }
}
```

#### g) Modification de `initializeDatabase()`
```javascript
async initializeDatabase() {
  const businessName = this.getBusinessNameFromConfig();
  const dbName = this.sanitizeDbName(businessName);
  
  // CHANGEMENT PRINCIPAL : Utiliser le dossier d'installation au lieu de %APPDATA%
  const appPath = this.getAppInstallPath();
  const dbDir = path.join(appPath, 'data');
  
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  
  this.dbPath = path.join(dbDir, `${dbName}.db`);
  
  // Initialiser la base de données...
  
  // Créer une sauvegarde initiale
  await this.createBackup('initial');
}
```

### 2. **AssetManager.js** ✅
**Fichier** : `backend/utils/generators/AssetManager.js`

**Nouvelle méthode ajoutée** :

```javascript
async createConfigFile(license) {
  // Créer le dossier resources
  const resourcesDir = path.join(this.projectPath, 'resources');
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }
  
  // Extraire le nom du commerce
  const businessName = license.configuration?.businessName || license.client?.name || 'CarthaposDB';
  
  // Créer l'objet de configuration
  const config = {
    businessName: businessName,
    clientId: license.clientId,
    licenseKey: license.licenseKey,
    createdAt: new Date().toISOString(),
    version: '1.0.0'
  };
  
  // Écrire config.json
  const configPath = path.join(resourcesDir, 'config.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  
  return configPath;
}
```

### 3. **index.js (Générateur Principal)** ✅
**Fichier** : `backend/utils/generators/index.js`

**Appel ajouté** :

```javascript
// 3. Copy template and manage assets
const assetManager = new AssetManager(projectInfo.projectPath);
await assetManager.copyTemplate();
await assetManager.ensurePreloadFile();
await assetManager.renameElectronFiles();
await assetManager.createConfigFile(validatedLicense); // ← NOUVEAU
logger.info('📋 Template and assets processed');
```

## 📁 Structure des Fichiers

### Ancienne Architecture (❌)
```
%APPDATA%\Roaming\
└── pos-maktabi\
    └── pos-data.db  (nom générique, dispersé)
```

### Nouvelle Architecture (✅)
```
D:\MonRestaurant\              # Installation
├── data\
│   └── Mon_Restaurant.db      # Base de données principale (portable)
└── resources\
    └── config.json            # Configuration du commerce

%APPDATA%\Roaming\
└── Mon_Restaurant\            # Dossier sécurisé
    └── backups\               # Sauvegardes automatiques
        ├── Mon_Restaurant_initial_2025-01-15_10-30-00.db
        ├── Mon_Restaurant_daily_2025-01-16_00-00-00.db
        └── ... (max 10 sauvegardes)
```

## 🔄 Flux d'Initialisation

1. **Génération du POS** :
   - `AssetManager.createConfigFile()` crée `resources/config.json` avec `businessName`

2. **Premier lancement du POS** :
   - `ElectronDatabaseManager.initializeDatabase()` lit `config.json`
   - Nettoie le nom : "Mon Restaurant" → "Mon_Restaurant"
   - Crée le dossier : `{InstallDir}\data\`
   - Crée la base : `{InstallDir}\data\Mon_Restaurant.db`
   - Crée les tables et données par défaut
   - Crée une sauvegarde initiale dans `%APPDATA%\Mon_Restaurant\backups\`

3. **Écran de Configuration Initiale** :
   - `needsFirstTimeSetup()` vérifie si la base contient un admin
   - Retourne `true` si aucun admin → affiche `SetupWizard`
   - Utilisateur crée le mot de passe admin
   - Sauvegarde automatique après création

## 🎯 Avantages de cette Architecture

### ✅ Portabilité
- Copier le dossier entier du POS = déplacer toute l'installation
- Base de données incluse dans l'installation
- Pas de dépendance à %APPDATA%

### ✅ Unicité
- Chaque POS a son propre nom de base de données
- Pas de conflits entre plusieurs POS
- Noms explicites (nom du commerce)

### ✅ Sécurité
- Sauvegardes automatiques dans %APPDATA%
- Rotation automatique (max 10 sauvegardes)
- Sauvegardes survit aux réinstallations

### ✅ Maintenabilité
- Structure claire et organisée
- Logs détaillés pour le débogage
- Nettoyage automatique des anciennes sauvegardes

## 🧪 Tests Requis

### Test 1 : Génération d'un Nouveau POS
1. Générer un POS avec `businessName = "Test Restaurant"`
2. Vérifier que `resources/config.json` existe
3. Vérifier le contenu de `config.json`

### Test 2 : Initialisation de la Base de Données
1. Lancer le POS généré
2. Vérifier que `data\Test_Restaurant.db` est créé
3. Vérifier que le dossier de sauvegarde existe dans `%APPDATA%`
4. Vérifier qu'une sauvegarde initiale est créée

### Test 3 : Premier Écran de Configuration
1. Lancer le POS fraîchement généré
2. Vérifier que `SetupWizard` s'affiche (création mot de passe admin)
3. Créer le compte admin
4. Vérifier la redirection vers l'écran de sélection de rôle
5. Vérifier qu'une sauvegarde est créée après la configuration

### Test 4 : Portabilité
1. Copier le dossier du POS vers un autre emplacement
2. Lancer le POS depuis le nouvel emplacement
3. Vérifier que la base de données fonctionne
4. Vérifier que les données sont préservées

### Test 5 : Sauvegardes Automatiques
1. Créer 12 sauvegardes manuelles
2. Vérifier que seulement les 10 dernières sont conservées
3. Vérifier que les sauvegardes sont horodatées

## 📋 Prochaines Étapes

1. **Rebuild du Template** ✅ (À faire)
   ```cmd
   cd pos-template
   npm run build
   ```

2. **Test de Génération** ✅ (À faire)
   - Générer un nouveau POS via l'admin panel
   - Définir `businessName = "Test Restaurant"` lors de la personnalisation

3. **Test de Premier Lancement** ✅ (À faire)
   - Installer le POS généré
   - Vérifier l'écran de configuration initiale
   - Créer le compte admin

4. **Validation** ✅ (À faire)
   - Vérifier l'emplacement de la base de données
   - Vérifier les sauvegardes dans %APPDATA%
   - Tester la portabilité

## 📝 Notes Importantes

- **Fallback** : Si `businessName` n'est pas fourni, le système utilise "CarthaposDB" par défaut
- **Nettoyage** : Les caractères spéciaux sont automatiquement supprimés du nom de la base
- **Longueur** : Les noms de base sont limités à 50 caractères
- **Compatibilité** : Le système fonctionne sur Windows, Linux et macOS
- **Logs** : Tous les événements sont loggés pour faciliter le débogage

## 🔍 Débogage

### Vérifier le config.json
```cmd
type "D:\MonRestaurant\resources\config.json"
```

### Vérifier la base de données
```cmd
dir "D:\MonRestaurant\data\*.db"
```

### Vérifier les sauvegardes
```cmd
dir "%APPDATA%\Mon_Restaurant\backups\*.db"
```

### Voir les logs Electron
- Ouvrir DevTools : `Ctrl+Shift+I`
- Aller dans l'onglet Console
- Chercher les messages `ElectronDatabaseManager`

## ✅ Résumé des Fichiers Modifiés

1. ✅ `pos-template/src/electron/ElectronDatabaseManager.js` - Système de base de données portable
2. ✅ `backend/utils/generators/AssetManager.js` - Création de config.json
3. ✅ `backend/utils/generators/index.js` - Appel de createConfigFile()

---

**Date de Création** : 2025-01-15
**Auteur** : GitHub Copilot
**Statut** : ✅ Implémentation Complète - En Attente de Tests
