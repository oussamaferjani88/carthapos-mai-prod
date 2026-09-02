/**
 * Single source of truth for the admin-dashboard permission catalog.
 * Keys use `<module>.<action>` dot notation. Assigned to ADMIN/MANAGER users
 * by the SUPER_ADMIN via the user-management UI. SUPER_ADMIN always bypasses
 * permission checks (role-based).
 */

const PERMISSION_CATALOG = [
  // Dashboard
  { key: 'dashboard.view', module: 'dashboard', name: "Voir le tableau de bord", description: "Accéder à la page d'accueil et ses statistiques" },

  // Clients
  { key: 'clients.view', module: 'clients', name: 'Voir les clients', description: 'Consulter la liste et les fiches clients' },
  { key: 'clients.create', module: 'clients', name: 'Créer des clients', description: 'Ajouter de nouveaux clients' },
  { key: 'clients.update', module: 'clients', name: 'Modifier les clients', description: 'Mettre à jour les informations clients' },
  { key: 'clients.delete', module: 'clients', name: 'Supprimer des clients', description: 'Supprimer définitivement un client' },

  // Licenses
  { key: 'licenses.view', module: 'licenses', name: 'Voir les licences', description: 'Consulter la liste et le détail des licences' },
  { key: 'licenses.create', module: 'licenses', name: 'Créer des licences', description: 'Générer de nouvelles licences' },
  { key: 'licenses.update', module: 'licenses', name: 'Modifier les licences', description: 'Éditer configuration, dates et statuts courants' },
  { key: 'licenses.suspend', module: 'licenses', name: 'Suspendre des licences', description: 'Suspendre une licence active' },
  { key: 'licenses.revoke', module: 'licenses', name: 'Révoquer des licences', description: 'Révoquer définitivement une licence' },
  { key: 'licenses.delete', module: 'licenses', name: 'Supprimer des licences', description: 'Supprimer définitivement une licence' },

  // Modules
  { key: 'modules.view', module: 'modules', name: 'Voir les modules', description: 'Consulter le catalogue des modules' },
  { key: 'modules.manage', module: 'modules', name: 'Gérer les modules', description: 'Créer, modifier ou supprimer des modules' },

  // POS
  { key: 'pos.view', module: 'pos', name: 'Voir le générateur POS', description: "Accéder au générateur de POS personnalisés" },
  { key: 'pos.generate', module: 'pos', name: 'Générer des POS', description: 'Lancer la génération d’un POS' },
  { key: 'pos.build', module: 'pos', name: 'Compiler des POS', description: 'Lancer la compilation (build) d’un POS' },

  // USB
  { key: 'usb.view', module: 'usb', name: 'Voir le gestionnaire USB', description: 'Détecter les clés USB et vérifier leur licence' },
  { key: 'usb.write', module: 'usb', name: 'Écrire sur USB', description: 'Écrire le fichier de licence sur une clé USB' },

  // Users (management is SUPER_ADMIN-only server-side; keys kept for future/display)
  { key: 'users.view', module: 'users', name: 'Voir les utilisateurs', description: 'Consulter les comptes utilisateurs' },
  { key: 'users.create', module: 'users', name: 'Créer des utilisateurs', description: 'Créer des comptes ADMIN/MANAGER' },
  { key: 'users.update', module: 'users', name: 'Modifier les utilisateurs', description: 'Mettre à jour des comptes' },
  { key: 'users.delete', module: 'users', name: 'Supprimer des utilisateurs', description: 'Supprimer des comptes' },
  { key: 'users.permissions', module: 'users', name: 'Gérer les permissions', description: 'Assigner ou retirer des permissions' },

  // Reports
  { key: 'reports.view', module: 'reports', name: 'Voir les rapports', description: 'Consulter les rapports et statistiques agrégées' },
  { key: 'reports.export', module: 'reports', name: 'Exporter les rapports', description: 'Exporter les données de rapports' },

  // Products & Inventory (POS-facing catalog access)
  { key: 'products.view', module: 'products', name: 'Voir les produits', description: 'Consulter le catalogue produits' },
  { key: 'products.edit', module: 'products', name: 'Modifier les produits', description: 'Créer ou modifier des produits' },
  { key: 'inventory.view', module: 'inventory', name: 'Voir le stock', description: 'Consulter l’état des stocks' },
  { key: 'inventory.edit', module: 'inventory', name: 'Modifier le stock', description: 'Ajuster les niveaux de stock' },

  // BI Analytics
  { key: 'bi.view', module: 'bi', name: 'Voir BI Analytics', description: 'Accéder à la section BI Analytics' },
  { key: 'bi.requests', module: 'bi', name: 'Demandes BI', description: 'Gérer les demandes BI des clients' },
  { key: 'bi.assignments', module: 'bi', name: 'Assignations BI', description: 'Gérer les assignations de tableaux de bord' },
  { key: 'bi.notifications', module: 'bi', name: 'Notifications BI', description: 'Consulter les notifications BI' },
  { key: 'bi.import', module: 'bi', name: 'Import BI', description: 'Importer et préparer des jeux de données BI' },
  { key: 'bi.history', module: 'bi', name: 'Historique BI', description: 'Consulter l’historique des imports BI' },
];

module.exports = { PERMISSION_CATALOG };
