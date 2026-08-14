// ─── Seed: BI dashboard templates ─────────────────────────────
// Registers the dashboard templates used by the RequestWizard and by
// dashboard generation (bi-dashboards generate/publish). Idempotent —
// upserts on businessType, never deletes.
//
// The restaurant template points at the verified live Metabase master
// dashboard (id 3, "Restaurant Executive Dashboard"). The other
// businessTypes still use placeholder ids until real Metabase masters are
// created for them — provisioning (POST /:id/provision) requires a real
// master and will fail with a clear error for those types.
//
// Phase 3 (Part 11): templates now carry kpis / dimensions / facts / image
// metadata so the client wizard can show richer cards.
//
// Usage: npm run seed:bi-templates   (or node scripts/seed-bi-templates.js)
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEMPLATES = [
  {
    businessType: 'restaurant',
    metabaseDashboardId: 3,
    name: 'Restaurant',
    description: 'Pilotage complet d’un restaurant : ventes, tables, cuisine, stock et clients.',
    image: 'ChefHat',
    kpis: ['Chiffre d’affaires', 'Panier moyen', 'Tickets par jour', 'Coût matières'],
    dimensions: ['Jour / Heure', 'Table', 'Catégorie', 'Serveur'],
    facts: ['Ventes', 'Commandes', 'Inventaire', 'Clientele'],
    active: true,
  },
  {
    businessType: 'cafe',
    metabaseDashboardId: 1002,
    name: 'Café',
    description: 'Suivi des ventes, commandes et encaissements pour un café.',
    image: 'Coffee',
    kpis: ['Chiffre d’affaires', 'Tickets moyens', 'Ventes par produit', 'Encaissements'],
    dimensions: ['Jour / Heure', 'Produit', 'Type de vente'],
    facts: ['Ventes', 'Commandes'],
    active: true,
  },
  {
    businessType: 'bakery',
    metabaseDashboardId: 1003,
    name: 'Boulangerie',
    description: 'Ventes, production et inventaire pour une boulangerie / pâtisserie.',
    image: 'Croissant',
    kpis: ['Chiffre d’affaires', 'Pièces vendues', 'Pertes de production', 'Rotation stock'],
    dimensions: ['Jour', 'Produit', 'Lot de production'],
    facts: ['Ventes', 'Production', 'Inventaire'],
    active: true,
  },
  {
    businessType: 'retail',
    metabaseDashboardId: 1004,
    name: 'Commerce de détail',
    description: 'Analyse des ventes, stocks et catégories produits pour le retail.',
    image: 'ShoppingCart',
    kpis: ['Chiffre d’affaires', 'Marge', 'Articles par ticket', 'Rotation stock'],
    dimensions: ['Jour / Mois', 'Catégorie', 'Produit', 'Magasin'],
    facts: ['Ventes', 'Inventaire'],
    active: true,
  },
  {
    businessType: 'pharmacy',
    metabaseDashboardId: 1005,
    name: 'Pharmacie',
    description: 'Ventes, produits et inventaire adaptés à une pharmacie.',
    image: 'Pill',
    kpis: ['Chiffre d’affaires', 'Ordonnances', 'Panier moyen', 'Stock critique'],
    dimensions: ['Jour', 'Rayon', 'Produit', 'Laboratoire'],
    facts: ['Ventes', 'Inventaire'],
    active: true,
  },
  {
    businessType: 'salon',
    metabaseDashboardId: 1006,
    name: 'Salon de beauté',
    description: 'Pilotage des ventes de services, rendez-vous et clients.',
    image: 'Sparkles',
    kpis: ['Chiffre d’affaires', 'Rendez-vous', 'Taux de remplissage', 'Clients fidèles'],
    dimensions: ['Jour / Semaine', 'Service', 'Employé', 'Client'],
    facts: ['Ventes', 'Rendez-vous'],
    active: true,
  },
  {
    businessType: 'hotel',
    metabaseDashboardId: 1007,
    name: 'Hôtel',
    description: 'Suivi des réservations, services et revenus hôteliers.',
    image: 'BedDouble',
    kpis: ['Revenus', 'Taux d’occupation', 'Prix moyen / nuit', 'Réservations'],
    dimensions: ['Jour / Mois', 'Type de chambre', 'Canal de réservation'],
    facts: ['Réservations', 'Services'],
    active: true,
  },
];

async function main() {
  console.log('🌱 Seeding BI dashboard templates...');
  let created = 0;
  let updated = 0;

  for (const t of TEMPLATES) {
    const existing = await prisma.biDashboardTemplate.findUnique({
      where: { businessType: t.businessType },
    });
    if (existing) {
      await prisma.biDashboardTemplate.update({
        where: { businessType: t.businessType },
        data: { ...t, updatedAt: new Date() },
      });
      updated += 1;
    } else {
      await prisma.biDashboardTemplate.create({ data: t });
      created += 1;
    }
    console.log(`  ${existing ? 'Updated' : 'Created'} template businessType=${t.businessType}`);
  }

  console.log(`✅ BI dashboard templates seeding complete (${created} created, ${updated} updated, ${TEMPLATES.length} total).`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding BI dashboard templates:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
