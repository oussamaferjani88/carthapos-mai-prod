# Système POS - Générateur de Logiciels de Caisse Personnalisés

Ce projet est un système complet de génération de logiciels de caisse POS (Point of Sale) personnalisés avec gestion de licences via clé USB.

## 🏗️ Architecture

Le système est composé de 3 parties principales :

### 1. Interface Admin (React.js)
- Configuration des POS (secteur, modules, thème)
- Gestion des clients et licences
- Génération des fichiers de licence chiffrés
- Interface de gestion USB

### 2. Backend (Node.js + Express + Prisma + PostgreSQL)
- API REST pour la gestion des données
- Génération et chiffrement des licences
- Gestion des modules et configurations
- Base de données des clients et licences

### 3. Template POS (Electron + React + SQLite)
- Application de caisse desktop
- Vérification de licence USB au démarrage
- Modules activables dynamiquement
- Base de données locale SQLite
- Interface personnalisable (thème, couleurs, logo)

## 🚀 Installation

### Prérequis
- Node.js 18+
- PostgreSQL
- pnpm (recommandé) ou npm

### Installation complète
```bash
# Cloner le projet
git clone <repository-url>
cd pos-system

# Installer toutes les dépendances
make install

# Ou manuellement :
cd backend && npm install
cd ../admin && pnpm install
cd ../pos-template && pnpm install
cd ../scripts && npm install
```

### Configuration de la base de données
```bash
# Configurer PostgreSQL et mettre à jour le .env dans backend/
# Puis :
make setup-db
```

## 🛠️ Développement

### Démarrage des services
```bash
# Terminal 1 - Backend
make dev-backend

# Terminal 2 - Interface Admin
make dev-admin

# Terminal 3 - Template POS
make dev-pos
```

Les services seront disponibles sur :
- Backend : http://localhost:3001
- Interface Admin : http://localhost:5173
- Template POS : Application Electron

## 📦 Génération d'Applications POS

### Exemples rapides
```bash
# Générer un POS pour restaurant
make example-restaurant

# Générer un POS pour café
make example-cafe
```

### Génération personnalisée
```bash
# 1. Créer un fichier de configuration
cp examples/restaurant-config.json my-config.json

# 2. Modifier la configuration selon vos besoins

# 3. Générer l'application
make build-pos CONFIG=my-config.json OUTPUT=./my-pos-app
```

## 🔐 Gestion des Licences

### Workflow complet
1. Créer un client dans l'interface admin
2. Générer une licence pour ce client
3. Configurer les modules et le thème
4. Générer l'application POS personnalisée
5. Générer le fichier de licence USB chiffré
6. Distribuer l'application + licence USB au client

## 🎨 Personnalisation

Le système permet une personnalisation complète via `POSConfiguration.js` :

### Éléments personnalisables
- **Couleurs** : Primaire, secondaire, accent, fond, texte
- **Typographie** : Police, taille, poids
- **Layout** : Position navbar, espacement, largeur max
- **Composants** : Cartes, boutons, grilles, formulaires
- **Effets** : Animations, ombres, arrondis, verre
- **Modules** : Activation/désactivation dynamique
- **Logo et branding** : Logo personnalisé, nom du commerce

### Configuration CSS/Tailwind

Le système utilise **Tailwind CSS** avec compilation via **PostCSS** :

```javascript
// Structure CSS
pos-template/
  src/
    index.css           → Importe complete.css
    styles/
      complete.css      → Contient @tailwind directives
      custom.css        → Styles personnalisés

// Configuration
postcss.config.js       → PostCSS + Tailwind + Autoprefixer
tailwind.config.js      → Configuration Tailwind
vite.config.js          → Vite avec support PostCSS
```

**⚠️ Important** : Les POS générés incluent automatiquement la configuration PostCSS/Tailwind pour que les styles soient correctement compilés. Voir [FIXES_CSS_GENERATION.md](./FIXES_CSS_GENERATION.md) pour plus de détails.

## 🧪 Tests et Vérification

### Vérifier un POS généré

```bash
# Utiliser le script de vérification automatique
cd scripts
node verify-pos-css.js ../generated-pos/pos-nom-client-xyz
```

Ce script vérifie :
- ✅ Présence de `postcss.config.js`
- ✅ Présence de `tailwind.config.js`
- ✅ Configuration PostCSS dans `vite.config.js`
- ✅ Fichiers CSS avec directives `@tailwind`
- ✅ Dépendances Tailwind dans `package.json`
- ✅ CSS compilé dans `dist/` (si build fait)

Voir [TESTING_CSS_FIX.md](./TESTING_CSS_FIX.md) pour le guide de test complet.

## 🔐 Gestion des Licences (suite)

### Génération d'une licence
```bash
# Créer un template de licence
cd scripts
node generate-license.js template license-config.json

# Modifier le fichier selon vos besoins

# Générer le fichier de licence chiffré
node generate-license.js generate license-config.json license.key
```

### Vérification d'une licence
```bash
cd scripts
node generate-license.js verify license.key
```

## 📁 Structure du Projet

```
pos-system/
├── admin/                  # Interface admin React
│   ├── src/
│   │   ├── components/     # Composants UI
│   │   ├── pages/          # Pages de l'application
│   │   └── lib/           # Utilitaires et API
│   └── package.json
├── backend/               # Serveur Node.js
│   ├── routes/           # Routes API
│   ├── utils/            # Utilitaires
│   ├── prisma/           # Schémas et migrations
│   └── server.js
├── pos-template/         # Template d'application POS
│   ├── public/
│   │   ├── electron.js   # Process principal Electron
│   │   └── preload.js    # Script preload
│   ├── src/
│   │   ├── components/   # Composants React
│   │   ├── pages/        # Pages du POS
│   │   ├── hooks/        # Hooks personnalisés
│   │   └── config/       # Configuration par défaut
│   └── package.json
├── scripts/              # Scripts de build et génération
│   ├── build-pos.js      # Générateur d'applications POS
│   ├── generate-license.js # Générateur de licences
│   └── package.json
├── examples/             # Exemples de configuration
└── Makefile             # Automatisation des tâches
```

## 🔧 Configuration

### Configuration d'une Application POS

```json
{
  "appConfig": {
    "theme": {
      "businessName": "Mon Commerce",
      "sector": "restaurant",
      "currency": "EUR",
      "taxRate": 20.0,
      "colors": {
        "primary": "#3B82F6",
        "accent": "#10B981",
        "background": "#FFFFFF",
        "text": "#1F2937"
      }
    }
  },
  "license": {
    "licenseKey": "POS-UNIQUE-KEY",
    "clientName": "Nom du Client",
    "sector": "restaurant",
    "licenseType": "LIFETIME", // ou "SUBSCRIPTION"
    "isActive": true,
    "modules": [
      {
        "name": "pos-core",
        "displayName": "Caisse de base",
        "isEnabled": true
      }
    ]
  }
}
```

### Modules Disponibles

- **pos-core** : Fonctionnalités de base (obligatoire)
- **inventory** : Gestion des stocks et produits
- **reports** : Rapports et analyses
- **kitchen-printer** : Impression en cuisine
- **table-management** : Gestion des tables (restaurants)
- **loyalty-program** : Programme de fidélité

## 🔒 Sécurité

### Chiffrement des Licences
- **Algorithme** : AES-256
- **Signature** : HMAC-SHA256
- **Checksum** : SHA-256
- **Vérification** : Intégrité et authenticité

### Variables d'Environnement
```bash
# Backend (.env)
DATABASE_URL="postgresql://user:password@localhost:5432/pos_system"
JWT_SECRET="your-jwt-secret-key"
ENCRYPTION_KEY="your-32-char-encryption-key"
PORT=3001

# Admin (.env)
VITE_API_URL=http://localhost:3001/api
```

## 🧪 Tests

```bash
# Test du système de licence
make test-license

# Tests unitaires (à implémenter)
npm test
```

## 📋 Fonctionnalités

### Interface Admin
- ✅ Gestion des clients
- ✅ Configuration des modules
- ✅ Génération de licences
- ✅ Gestion USB
- ✅ Personnalisation des thèmes

### Application POS
- ✅ Vérification de licence USB
- ✅ Interface de vente
- ✅ Gestion des produits
- ✅ Rapports de ventes
- ✅ Paramètres configurables
- ✅ Base de données SQLite locale

### Système de Build
- ✅ Génération automatique d'applications
- ✅ Packaging Electron
- ✅ Configuration personnalisée
- ✅ Scripts d'automatisation

## 🚀 Déploiement

### Production
1. Configurer les variables d'environnement
2. Builder l'interface admin : `make build-admin`
3. Déployer le backend sur votre serveur
4. Utiliser l'interface admin pour générer les POS

### Distribution des Applications POS
Les applications générées sont des exécutables Electron autonomes :
- Windows : `.exe`
- macOS : `.app`
- Linux : `AppImage`

## 📞 Support

Pour toute question ou problème :
1. Vérifiez la documentation
2. Consultez les exemples dans `/examples`
3. Utilisez `make help` pour voir toutes les commandes disponibles

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier LICENSE pour plus de détails.

---

**Développé avec ❤️ pour simplifier la gestion des points de vente**

