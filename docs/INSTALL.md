# Guide d'Installation - Système POS

## 🚀 Installation Rapide

### Prérequis
- **Node.js** 18+ ([télécharger](https://nodejs.org/))
- **PostgreSQL** 12+ ([télécharger](https://www.postgresql.org/download/))
- **Git** ([télécharger](https://git-scm.com/))

### Installation Automatique

```bash
# 1. Extraire l'archive
unzip pos-system.zip
cd pos-system

# 2. Installation complète
make install

# 3. Configuration de la base de données
# Créer une base PostgreSQL et mettre à jour backend/.env
make setup-db

# 4. Démarrer les services
make start-all
```

## 📋 Installation Détaillée

### 1. Configuration de PostgreSQL

```sql
-- Créer la base de données
CREATE DATABASE pos_system;
CREATE USER pos_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE pos_system TO pos_user;
```

### 2. Configuration des Variables d'Environnement

#### Backend (`backend/.env`)
```env
DATABASE_URL="postgresql://pos_user:your_password@localhost:5432/pos_system"
JWT_SECRET="your-super-secret-jwt-key-here"
ENCRYPTION_KEY="your-32-character-encryption-key"
PORT=3001
```

#### Admin (`admin/.env`)
```env
VITE_API_URL=http://localhost:3001/api
```

### 3. Installation des Dépendances

```bash
# Backend
cd backend
npm install

# Interface Admin
cd ../admin
npm install -g pnpm  # Si pnpm n'est pas installé
pnpm install

# Template POS
cd ../pos-template
pnpm install

# Scripts
cd ../scripts
npm install
```

### 4. Configuration de la Base de Données

```bash
cd backend
npx prisma migrate dev --name init
npx prisma db seed
```

## 🛠️ Démarrage des Services

### Mode Développement

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Interface Admin
cd admin
pnpm run dev

# Terminal 3 - Template POS (optionnel)
cd pos-template
pnpm run electron-dev
```

### Accès aux Services
- **Interface Admin** : http://localhost:5173
- **API Backend** : http://localhost:3001
- **Documentation API** : http://localhost:3001/api/docs

## 🎯 Premier Démarrage

### 1. Créer un Client
1. Ouvrir l'interface admin (http://localhost:5173)
2. Aller dans "Clients"
3. Créer un nouveau client

### 2. Configurer une Licence
1. Aller dans "Générateur POS"
2. Sélectionner le secteur d'activité
3. Choisir les modules
4. Configurer le thème
5. Générer la licence

### 3. Créer une Application POS
1. Brancher une clé USB
2. Cliquer sur "Générer POS"
3. L'application sera créée et la licence copiée sur la clé USB

## 🔧 Génération d'Applications POS

### Méthode 1 : Interface Admin
1. Utiliser l'interface web pour configurer et générer

### Méthode 2 : Ligne de Commande
```bash
# Créer une configuration
cp examples/restaurant-config.json my-config.json

# Générer l'application
make build-pos CONFIG=my-config.json OUTPUT=./my-pos-app
```

### Méthode 3 : Exemples Prêts
```bash
# Restaurant complet
make example-restaurant

# Café simple
make example-cafe
```

## 🔐 Gestion des Licences

### Créer une Licence Manuelle
```bash
cd scripts

# 1. Créer un template
node generate-license.js template license-config.json

# 2. Modifier le fichier selon vos besoins

# 3. Générer le fichier chiffré
node generate-license.js generate license-config.json license.key

# 4. Copier license.key sur une clé USB
```

### Vérifier une Licence
```bash
cd scripts
node generate-license.js verify /path/to/license.key
```

## 🚨 Dépannage

### Problème : Base de données inaccessible
```bash
# Vérifier que PostgreSQL fonctionne
sudo systemctl status postgresql

# Tester la connexion
psql -h localhost -U pos_user -d pos_system
```

### Problème : Port déjà utilisé
```bash
# Changer le port dans backend/.env
PORT=3002

# Mettre à jour l'URL dans admin/.env
VITE_API_URL=http://localhost:3002/api
```

### Problème : Modules npm manquants
```bash
# Réinstaller toutes les dépendances
make clean
make install
```

### Problème : Electron ne démarre pas
```bash
cd pos-template

# Vérifier les dépendances Electron
pnpm list electron

# Réinstaller si nécessaire
pnpm add electron@latest
```

## 📦 Déploiement en Production

### Backend
```bash
cd backend
npm run build  # Si applicable
npm start
```

### Interface Admin
```bash
cd admin
pnpm run build
# Servir le dossier dist/ avec nginx ou apache
```

### Applications POS
Les applications générées sont des exécutables autonomes :
- Copier sur les machines cibles
- Fournir la clé USB avec la licence
- Lancer l'application

## 🔄 Mise à Jour

### Mise à jour du Système
```bash
git pull origin main
make install
make setup-db  # Si nouvelles migrations
```

### Mise à jour des Applications POS
1. Régénérer avec la nouvelle version
2. Redistribuer aux clients
3. Les licences existantes restent valides

## 📞 Support

### Logs Utiles
```bash
# Logs backend
cd backend && npm run dev

# Logs Electron
# Ouvrir DevTools dans l'application POS (Ctrl+Shift+I)

# Logs base de données
tail -f /var/log/postgresql/postgresql-*.log
```

### Commandes de Diagnostic
```bash
# Vérifier l'installation
make help

# Tester les licences
make test-license

# Vérifier les services
curl http://localhost:3001/api/health
```

## 🎓 Formation

### Utilisation de l'Interface Admin
1. **Clients** : Gérer les informations clients
2. **Modules** : Configurer les fonctionnalités disponibles
3. **Générateur POS** : Créer des applications personnalisées
4. **Licences** : Gérer les licences actives
5. **USB** : Gérer les clés USB et licences

### Utilisation du POS
1. **Ventes** : Interface de caisse
2. **Produits** : Gestion du catalogue
3. **Rapports** : Analyses et statistiques
4. **Paramètres** : Configuration locale

---

**Pour toute assistance supplémentaire, consultez le README.md ou contactez le support technique.**

