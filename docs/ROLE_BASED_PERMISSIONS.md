# Système de Permissions Basé sur les Rôles

## Vue d'ensemble

Le système POS implémente maintenant un système complet de permissions basé sur les rôles avec deux types d'utilisateurs :

### 👑 Administrateur
- Accès complet à tous les modules sélectionnés
- Accès automatique au module "Gestion des Utilisateurs"
- Peut créer et gérer les comptes caissiers
- Peut assigner des modules spécifiques aux caissiers
- Peut voir et gérer toutes les fonctionnalités du système

### 👤 Caissier
- Accès limité aux modules de base + modules assignés
- **Modules de base (toujours accessibles)** :
  - 📊 Dashboard (Tableau de bord)
  - 🛒 Ventes
- **Modules assignés** : L'administrateur peut attribuer des modules additionnels
- Pas d'accès au module de gestion des utilisateurs
- Interface simplifiée pour se concentrer sur les opérations de vente

---

## Architecture Technique

### 1. Gestion des Rôles dans POSPreview.jsx

```javascript
// États pour la simulation de rôle
const [currentUserRole, setCurrentUserRole] = useState('admin'); // 'admin' ou 'cashier'
const [cashierModules, setCashierModules] = useState(['dashboard', 'sales', 'customers']);

// Fonction de filtrage des modules selon le rôle
const getFilteredModules = () => {
  if (currentUserRole === 'admin') {
    // Admin voit tous les modules + gestion utilisateurs
    return [...modules, 'user-management'];
  } else {
    // Caissier voit seulement les modules de base + assignés
    const baseModules = ['dashboard', 'sales'];
    return [...baseModules, ...cashierModules];
  }
};

const filteredModules = getFilteredModules();
```

### 2. Sélecteur de Rôle dans POSHeader.jsx

Le header affiche maintenant un sélecteur de rôle en mode prévisualisation :

```jsx
{/* Role Switcher for Preview */}
{config.isPreviewMode && setCurrentUserRole && (
  <div className="flex items-center space-x-2">
    <span className="text-xs font-medium">Vue:</span>
    <select
      value={currentUserRole}
      onChange={(e) => setCurrentUserRole(e.target.value)}
      className="text-sm px-3 py-1.5 rounded-lg border"
    >
      <option value="admin">👑 Administrateur</option>
      <option value="cashier">👤 Caissier</option>
    </select>
  </div>
)}
```

**Indicateurs visuels** :
- Admin : Fond violet (`rgb(147, 51, 234, 0.1)`)
- Caissier : Fond bleu (`rgb(59, 130, 246, 0.1)`)

### 3. Navigation Dynamique (POSNavbar.jsx)

La barre de navigation utilise le registre de composants pour filtrer dynamiquement les modules :

```javascript
const navigationItems = useMemo(() => {
  return POSComponentRegistry.getNavigationItems(modules);
}, [modules]);
```

Seuls les modules présents dans `filteredModules` seront affichés dans la navigation.

### 4. Module de Gestion des Utilisateurs (POSUserManagement.jsx)

Interface complète pour gérer les utilisateurs avec :

#### Fonctionnalités Principales

**Liste des utilisateurs**
- Affichage en grille avec cartes utilisateur
- Badges de rôle colorés (Admin violet, Caissier bleu)
- Statut actif/inactif avec indicateur visuel
- Boutons d'action : Modifier, Activer/Désactiver

**Création d'utilisateurs**
- Formulaire avec validation
- Champs : Nom complet, Email, Mot de passe, Rôle
- Toggle de visibilité du mot de passe
- Génération automatique d'ID unique

**Assignation de modules aux caissiers**
- Liste de modules avec checkboxes
- Dashboard et Ventes toujours activés (obligatoires)
- Sélection multiple pour modules additionnels
- Sauvegarde des permissions par utilisateur

**Filtrage**
- Filtres par rôle : Tous / Admin / Caissier
- Recherche dynamique par nom ou email

```jsx
// Exemple de structure utilisateur
{
  id: "user-mcxyz123",
  name: "Jean Dupont",
  email: "jean.dupont@example.com",
  role: "cashier",
  isActive: true,
  assignedModules: ["dashboard", "sales", "customers", "inventory"]
}
```

---

## Flux de Données

```
POSPreview (Parent)
  │
  ├─ currentUserRole (state) ──────────────┐
  ├─ cashierModules (state) ───────────────┤
  ├─ getFilteredModules() ─────────────────┤
  │                                         │
  ├─► POSHeader                             │
  │    └─ Role Switcher (onChange) ─────────┘
  │
  ├─► POSNavbar
  │    └─ modules={filteredModules} ──► Affiche seulement les modules autorisés
  │
  └─► POSContent
       └─ modules={filteredModules} ──► Charge seulement les composants autorisés
```

---

## Scénarios d'Utilisation

### Scénario 1 : Configuration d'un nouveau caissier

1. **Admin** se connecte et accède au module "Gestion des Utilisateurs"
2. Clique sur "Ajouter un utilisateur"
3. Remplit le formulaire :
   - Nom : "Marie Martin"
   - Email : "marie@caffe.com"
   - Mot de passe : Généré automatiquement
   - Rôle : Caissier
4. Assigne les modules :
   - ✅ Dashboard (obligatoire)
   - ✅ Ventes (obligatoire)
   - ✅ Clients
   - ✅ Inventaire
   - ❌ Rapports (non assigné)
5. Clique sur "Créer l'utilisateur"
6. Marie peut maintenant se connecter et ne verra que Dashboard, Ventes, Clients, et Inventaire

### Scénario 2 : Test de la vue Caissier

1. **Admin** ouvre la prévisualisation
2. Utilise le sélecteur de rôle dans le header
3. Change de "👑 Administrateur" à "👤 Caissier"
4. L'interface se met à jour instantanément :
   - La navigation affiche seulement Dashboard et Ventes
   - Le module "Gestion des Utilisateurs" disparaît
   - Les modules non-assignés sont masqués
5. Peut revenir à la vue Admin pour voir toutes les fonctionnalités

### Scénario 3 : Modification des permissions

1. **Admin** accède à "Gestion des Utilisateurs"
2. Clique sur "Modifier" pour le caissier "Marie Martin"
3. Active le module "Rapports" dans les checkboxes
4. Sauvegarde les modifications
5. Marie a maintenant accès au module Rapports lors de sa prochaine connexion

---

## Modules du Système

### Modules CORE (Toujours disponibles)
1. 📊 **Dashboard** - Tableau de bord
2. 🛒 **Sales** - Ventes (Point de vente)
3. 📦 **Inventory** - Gestion des stocks
4. 👥 **Customers** - Gestion des clients
5. 🏷️ **Barcode** - Générateur de codes-barres

### Modules Optionnels (28 modules)

**Commerce & Ventes**
6. 🏪 Multi-Magasin
7. 🔄 Transferts
8. 🎨 Variantes
9. 🎉 Promotions
10. 💳 Paiements Fractionnés
11. 💰 Gestion Fiscale
12. 📱 Mode Hors-ligne

**Gestion du Personnel**
13. 👷 Gestion des Employés
14. 🔐 Gestion des Utilisateurs (Admin uniquement)

**Équipements & Intégrations**
15. ⚖️ Balance
16. 🔢 Numéros de Série/Lots
17. 💎 Mise de Côté (Layaway)
18. 🎪 Location

**Clients & Fidélité**
19. 🎁 Programme de Fidélité
20. 🎫 Bons Cadeaux
21. 💳 Comptes Clients

**Restaurant & Services**
22. 🍽️ Gestion des Tables
23. 🍕 Gestion des Commandes
24. 🚚 Livraison
25. 📅 Réservations
26. 🧾 Factures

**Analytique & Rapports**
27. 📊 Rapports Avancés
28. 📈 Statistiques
29. 🎯 Prévisions

**Gestion Avancée**
30. 🏭 Fabrication
31. ⏱️ Gestion du Temps
32. 🛠️ SAV (Service Après-Vente)
33. 🎓 Formation

---

## Sécurité et Bonnes Pratiques

### Dans le Contexte de Prévisualisation (Frontend)

✅ **Ce qui est implémenté** :
- Filtrage visuel des modules selon le rôle
- Interface de gestion des permissions
- Simulation de rôles pour tester l'UX

⚠️ **Limitations actuelles** :
- La sécurité réelle sera implémentée côté backend
- Les données utilisateurs sont simulées (pas de base de données encore)
- Le changement de rôle est instantané (pas d'authentification réelle)

### Pour la Production (À implémenter)

🔒 **Recommandations** :

1. **Authentification Backend**
   ```javascript
   // API endpoint pour login
   POST /api/auth/login
   {
     email: "user@example.com",
     password: "********"
   }
   
   // Réponse avec JWT token
   {
     token: "eyJhbGc...",
     user: {
       id: "user-123",
       role: "cashier",
       assignedModules: ["dashboard", "sales", "customers"]
     }
   }
   ```

2. **Middleware de Vérification**
   ```javascript
   // Backend - Express middleware
   const checkModuleAccess = (requiredModule) => {
     return (req, res, next) => {
       const { user } = req;
       if (user.role === 'admin' || user.assignedModules.includes(requiredModule)) {
         next();
       } else {
         res.status(403).json({ error: 'Access denied' });
       }
     };
   };
   
   // Route protégée
   app.get('/api/customers', checkModuleAccess('customers'), getCustomers);
   ```

3. **Stockage Sécurisé des Permissions**
   ```sql
   -- Table users
   CREATE TABLE users (
     id VARCHAR(255) PRIMARY KEY,
     name VARCHAR(255) NOT NULL,
     email VARCHAR(255) UNIQUE NOT NULL,
     password_hash VARCHAR(255) NOT NULL,
     role ENUM('admin', 'cashier') NOT NULL,
     is_active BOOLEAN DEFAULT true,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );
   
   -- Table user_modules (many-to-many)
   CREATE TABLE user_modules (
     user_id VARCHAR(255),
     module_id VARCHAR(255),
     granted_by VARCHAR(255),
     granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (user_id, module_id),
     FOREIGN KEY (user_id) REFERENCES users(id),
     FOREIGN KEY (granted_by) REFERENCES users(id)
   );
   ```

---

## Guide de Test

### Test 1 : Vérifier l'interface Admin

1. Ouvrez la prévisualisation du POS
2. Vérifiez que le sélecteur affiche "👑 Administrateur"
3. Vérifiez que tous les modules choisis sont visibles dans la navigation
4. Vérifiez que "Gestion des Utilisateurs" est présent (icône Shield)
5. Cliquez sur "Gestion des Utilisateurs"
6. Vérifiez l'interface de CRUD des utilisateurs

### Test 2 : Vérifier l'interface Caissier

1. Dans le header, changez la vue à "👤 Caissier"
2. Vérifiez que la navigation affiche seulement :
   - Dashboard
   - Ventes
   - (Modules assignés par défaut : Clients)
3. Vérifiez que "Gestion des Utilisateurs" n'est PAS visible
4. Tentez d'accéder à un module non-assigné (devrait être masqué)

### Test 3 : Création et assignation de modules

1. Vue Admin → Gestion des Utilisateurs
2. Cliquer "Ajouter un utilisateur"
3. Créer un caissier "Test User"
4. Assigner les modules : Dashboard, Ventes, Clients, Inventaire
5. Basculer en vue Caissier
6. Vérifier que ces 4 modules sont maintenant visibles

### Test 4 : Filtrage des utilisateurs

1. Vue Admin → Gestion des Utilisateurs
2. Créer 2 admins et 3 caissiers
3. Utiliser le filtre "Caissiers" → Vérifier que seuls les caissiers apparaissent
4. Utiliser le filtre "Admins" → Vérifier que seuls les admins apparaissent
5. Utiliser le filtre "Tous" → Vérifier que tous les utilisateurs apparaissent

---

## Dépannage

### Problème : Le sélecteur de rôle n'apparaît pas

**Solution** : Vérifiez que `config.isPreviewMode` est `true` dans POSPreview.jsx

```javascript
const config = POSConfiguration.createConfig({
  isPreviewMode: true, // ← Doit être true
  ...configuration
});
```

### Problème : Les modules ne se filtrent pas correctement

**Solution** : Vérifiez que `filteredModules` est bien passé à POSNavbar et POSContent

```javascript
// Dans POSPreview.jsx
<POSNavbar modules={filteredModules} /> {/* Pas modules */}
<POSContent modules={filteredModules} /> {/* Pas modules */}
```

### Problème : Le module "Gestion des Utilisateurs" n'apparaît pas pour l'admin

**Solution** : Vérifiez que le module est bien ajouté dans getFilteredModules()

```javascript
if (currentUserRole === 'admin') {
  return [...modules, 'user-management']; // ← user-management doit être ajouté
}
```

### Problème : Impossible de désassigner Dashboard ou Ventes d'un caissier

**Solution** : C'est normal ! Ces modules sont obligatoires pour tous les caissiers. Voir POSUserManagement.jsx :

```javascript
const isMandatoryModule = (moduleId) => {
  return moduleId === 'dashboard' || moduleId === 'sales';
};

<input
  type="checkbox"
  checked={true}
  disabled={isMandatoryModule(item.id)} // ← Désactivé pour dashboard et sales
/>
```

---

## Prochaines Étapes

### Phase 1 : Backend Authentication ⏳
- Implémenter l'API d'authentification avec JWT
- Créer les tables de base de données pour users et user_modules
- Ajouter le middleware de vérification des permissions

### Phase 2 : Persistance des Données ⏳
- Connecter POSUserManagement à l'API backend
- Stocker les utilisateurs et permissions en base de données
- Implémenter la synchronisation en temps réel

### Phase 3 : Sécurité Avancée ⏳
- Chiffrement des mots de passe (bcrypt)
- Gestion des sessions et tokens
- Logs d'audit pour les changements de permissions
- 2FA (Authentification à deux facteurs) optionnelle

### Phase 4 : Fonctionnalités Additionnelles ⏳
- Gestion des groupes de permissions
- Permissions granulaires par action (read/write/delete)
- Historique des connexions
- Notifications par email lors de création de compte

---

## Conclusion

Le système de permissions basé sur les rôles est maintenant pleinement opérationnel dans l'interface de prévisualisation. Les administrateurs peuvent :

- ✅ Gérer tous les modules du système
- ✅ Créer et gérer des comptes caissiers
- ✅ Assigner des permissions spécifiques à chaque caissier
- ✅ Tester les vues Admin et Caissier en temps réel
- ✅ Visualiser l'interface exacte que verra chaque rôle

Les caissiers ont une interface simplifiée qui leur permet de :

- ✅ Accéder au Dashboard et aux Ventes (toujours)
- ✅ Utiliser les modules qui leur ont été assignés
- ✅ Se concentrer sur les opérations de vente sans distractions

Cette implémentation fournit une base solide pour la sécurité et la gestion des utilisateurs du système POS.
