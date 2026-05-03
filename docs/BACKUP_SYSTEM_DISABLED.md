# 🔴 Système de Backup Désactivé (Temporaire)

**Date:** 17 octobre 2025  
**Statut:** Désactivé pour débloquer la génération du POS  
**Fichier modifié:** `pos-template/src/lib/system/autoBackup.js`

---

## 🎯 Raison de la Désactivation

Le système de backup automatique causait des **crashes** lors de l'exécution du POS généré avec l'erreur suivante :

```
TypeError: window.electronAPI.getSalesData is not a function
TypeError: window.electronAPI.getInventoryData is not a function
TypeError: window.electronAPI.saveBackup is not a function
```

### Cause Racine

Le système de backup dans `autoBackup.js` tente d'utiliser des fonctions Electron qui **ne sont pas encore implémentées** :

- ❌ `window.electronAPI.getSalesData()`
- ❌ `window.electronAPI.getProductsData()`
- ❌ `window.electronAPI.getCustomersData()`
- ❌ `window.electronAPI.getInventoryData()`
- ❌ `window.electronAPI.saveBackup()`
- ❌ `window.electronAPI.cleanupOldBackups()`

---

## ✅ Solution Appliquée (Option A - Rapide)

### Modifications dans `autoBackup.js`

**1. Constructeur - Backup désactivé par défaut**
```javascript
constructor() {
  this.isEnabled = false; // 🔴 DÉSACTIVÉ - Les fonctions Electron ne sont pas encore implémentées
  // ...
}
```

**2. Protection dans `performAutomaticBackup()`**
```javascript
async performAutomaticBackup() {
  // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
  if (!this.isEnabled) {
    console.log('Backup system is disabled, skipping automatic backup');
    return;
  }
  // ...
}
```

**3. Protection dans `createBackup()`**
```javascript
async createBackup(type = 'manual', options = {}) {
  // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
  if (!this.isEnabled) {
    console.log('Backup system is disabled, skipping backup creation');
    window.showNotification?.('Système de sauvegarde désactivé', 'warning', { duration: 3000 });
    return null;
  }
  // ...
}
```

**4. Protection dans `startAutomaticBackup()`**
```javascript
startAutomaticBackup() {
  // 🔴 DÉSACTIVÉ - Ne rien faire si le backup est désactivé
  if (!this.isEnabled) {
    console.log('Backup system is disabled, automatic backup will not start');
    return;
  }
  // ...
}
```

---

## 🔍 Impact

### Ce qui fonctionne toujours :
✅ Le POS se lance sans crash  
✅ Login fonctionne  
✅ Modules filtrés correctement  
✅ Thème appliqué  
✅ Logo affiché  
✅ Toutes les fonctionnalités métier (ventes, produits, clients, etc.)

### Ce qui est désactivé :
❌ Sauvegarde automatique toutes les 5 minutes  
❌ Sauvegarde manuelle via le bouton dans HardwareSettings  
❌ Historique des sauvegardes  
❌ Restauration de sauvegarde

---

## 🚀 Prochaine Étape : Option B (Implémentation Complète)

### Pour réactiver le système de backup, il faut :

**1. Installer la dépendance SQLite**
```bash
cd pos-template
npm install better-sqlite3
```

**2. Modifier `preload.js`**
Ajouter les 6 fonctions IPC dans `contextBridge.exposeInMainWorld('electronAPI', {})` :
- `getSalesData()`
- `getProductsData()`
- `getCustomersData()`
- `getInventoryData()`
- `saveBackup(backup)`
- `cleanupOldBackups(maxBackups)`

**3. Modifier `electron.js`**
Implémenter les 6 handlers IPC avec `ipcMain.handle()` :
- Créer connexion SQLite
- Récupérer données des tables
- Sauvegarder dans `backups/` folder
- Nettoyer anciennes sauvegardes

**4. Réactiver dans `autoBackup.js`**
```javascript
constructor() {
  this.isEnabled = true; // ✅ RÉACTIVÉ après implémentation
  // ...
}
```

**Temps estimé :** 60 minutes  
**Fichiers à modifier :** preload.js, electron.js, autoBackup.js  
**Dépendances :** better-sqlite3

---

## 📝 Notes

- Le système est **entièrement fonctionnel** côté frontend (autoBackup.js)
- Seule la couche Electron (IPC handlers) manque
- Les données sont toujours dans SQLite, juste pas de backup automatique
- L'utilisateur peut quand même exporter les données manuellement via les modules

---

## ✅ Test de Validation

Après désactivation du backup, vérifier que :
1. ✅ Le POS se lance sans erreur
2. ✅ Aucun message d'erreur dans la console
3. ✅ Login fonctionne
4. ✅ Modules filtrés
5. ✅ Thème appliqué
6. ✅ Logo affiché
7. ✅ Aucune tentative de backup automatique (vérifier console)

---

**Prêt pour la génération du POS !** 🎉
