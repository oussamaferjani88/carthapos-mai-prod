const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs'); // standard in this project, often bcryptjs instead of bcrypt

// Use existing prisma instance if passed, or create new one
const prisma = new PrismaClient();

async function autoSeed() {
    try {
        // 1. Check if seeding is needed
        const moduleCount = await prisma.module.count();
        if (moduleCount > 0) {
            console.log('✅ Database already seeded (Modules exist).');
            return;
        }

        console.log('🌱 Database is empty. Starting Auto-Seed...');

        // 2. Define Modules (From original seed.js)
        const modules = [
            // Modules core (toujours activés)
            {
                name: 'pos-core',
                displayName: 'Caisse de base',
                description: 'Fonctionnalités de base de la caisse (vente, paiement, tickets)',
                category: 'core',
                isCore: true
            },
            {
                name: 'user-management',
                displayName: 'Gestion des utilisateurs',
                description: 'Gestion des comptes utilisateurs et des permissions',
                category: 'core',
                isCore: true
            },
            {
                name: 'reports',
                displayName: 'Rapports',
                description: 'Rapports de vente et statistiques de base',
                category: 'core',
                isCore: true
            },

            {
                name: 'barcode',
                displayName: 'Code-barres',
                description: 'Lecture et génération de codes-barres',
                category: 'core',
                isCore: true
            },

            // Modules optionnels - Gestion des stocks
            {
                name: 'inventory',
                displayName: 'Gestion des stocks',
                description: 'Suivi des stocks, alertes de rupture, réapprovisionnement',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'suppliers',
                displayName: 'Fournisseurs',
                description: 'Gestion des fournisseurs et des commandes',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'multi-store',
                displayName: 'Multi-magasins',
                description: 'Gestion de plusieurs magasins, transferts, rapports consolidés',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'transfers',
                displayName: 'Transferts de stock',
                description: 'Mouvements entre magasins ou entrepôts',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'variants',
                displayName: 'Gestion des variantes',
                description: 'Variantes produit (taille, couleur, style)',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'promotions',
                displayName: 'Promotions',
                description: 'Gestion des promotions, réductions, offres spéciales',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'serial-batch',
                displayName: 'Suivi série/lot',
                description: 'Traçabilité par numéro de série ou lot, garanties',
                category: 'inventory',
                isCore: false
            },
            {
                name: 'weight-scale',
                displayName: 'Intégration balance',
                description: 'Vente au poids (épiceries, produits frais)',
                category: 'inventory',
                isCore: false
            },

            // Modules optionnels - Restaurant
            {
                name: 'tables',
                displayName: 'Gestion des tables',
                description: 'Plan de salle, réservations, gestion des tables',
                category: 'restaurant',
                isCore: false
            },
            {
                name: 'kitchen',
                displayName: 'Cuisine',
                description: 'Impression des commandes en cuisine, suivi des préparations',
                category: 'restaurant',
                isCore: false
            },
            {
                name: 'menu-management',
                displayName: 'Gestion du menu',
                description: 'Création et modification des menus, catégories, prix',
                category: 'restaurant',
                isCore: false
            },

            // Modules optionnels - Service rapide
            {
                name: 'quick-service',
                displayName: 'Service rapide',
                description: 'Interface optimisée pour la vente rapide',
                category: 'service',
                isCore: false
            },
            {
                name: 'takeaway',
                displayName: 'Vente à emporter',
                description: 'Gestion des commandes à emporter et livraisons',
                category: 'service',
                isCore: false
            },

            // Modules optionnels - Client
            {
                name: 'customer-management',
                displayName: 'Gestion des clients',
                description: 'Base de données clients, historique, fidélité',
                category: 'customer',
                isCore: false
            },
            {
                name: 'loyalty',
                displayName: 'Programme de fidélité',
                description: 'Points de fidélité, cartes, promotions',
                category: 'customer',
                isCore: false
            },
            {
                name: 'promotions',
                displayName: 'Promotions & remises',
                description: 'Réductions, coupons, offres spéciales, bundles',
                category: 'customer',
                isCore: false
            },
            {
                name: 'layaway',
                displayName: 'Acomptes/Réservations',
                description: 'Réserver des produits, paiements partiels',
                category: 'customer',
                isCore: false
            },

            // Modules optionnels - Paiement
            {
                name: 'payment-advanced',
                displayName: 'Paiements avancés',
                description: 'Paiements par carte, sans contact, mobile',
                category: 'payment',
                isCore: false
            },
            {
                name: 'gift-cards',
                displayName: 'Cartes cadeaux',
                description: 'Émission et gestion des cartes cadeaux',
                category: 'payment',
                isCore: false
            },
            {
                name: 'split-payments',
                displayName: 'Paiements multiples',
                description: 'Mélange de plusieurs modes (espèces + carte + bon)',
                category: 'payment',
                isCore: false
            },

            // Modules optionnels - Spécialisés
            {
                name: 'appointments',
                displayName: 'Rendez-vous',
                description: 'Gestion des rendez-vous et planning',
                category: 'specialized',
                isCore: false
            },
            {
                name: 'services',
                displayName: 'Gestion des services',
                description: 'Catalogue de services, durées, tarifs',
                category: 'specialized',
                isCore: false
            },
            {
                name: 'prescription',
                displayName: 'Ordonnances',
                description: 'Gestion des ordonnances médicales',
                category: 'specialized',
                isCore: false
            },
            {
                name: 'production',
                displayName: 'Production',
                description: 'Suivi de la production, recettes, coûts',
                category: 'specialized',
                isCore: false
            },
            {
                name: 'rental',
                displayName: 'Location',
                description: 'Location d\'articles (équipements, costumes, outils)',
                category: 'specialized',
                isCore: false
            },

            // Modules optionnels - Administration
            {
                name: 'tax-management',
                displayName: 'Gestion des taxes/TVA',
                description: 'Multi-taux, exemptions, règles fiscales locales',
                category: 'administration',
                isCore: false
            },
            {
                name: 'employee-management',
                displayName: 'Gestion du personnel',
                description: 'Horaires, présences, commissions, paie',
                category: 'administration',
                isCore: false
            },
            {
                name: 'user-management',
                displayName: 'Gestion des utilisateurs',
                description: 'Créer comptes caissiers, gérer permissions et modules',
                category: 'administration',
                isCore: false
            },
            {
                name: 'offline-mode',
                displayName: 'Mode hors-ligne',
                description: 'Fonctionne sans internet, synchronisation ultérieure',
                category: 'administration',
                isCore: false
            }
        ];

        console.log(`📦 Creating ${modules.length} modules...`);
        for (const moduleData of modules) {
            await prisma.module.upsert({
                where: { name: moduleData.name },
                update: moduleData,
                create: moduleData
            });
        }

        // 3. Create Test Client
        console.log('👤 Creating test client...');
        const testClient = await prisma.client.upsert({
            where: { email: 'test@example.com' },
            update: {},
            create: {
                name: 'Restaurant Le Gourmet',
                email: 'test@example.com',
                phone: '+33 1 23 45 67 89',
                address: '123 Rue de la Paix, 75001 Paris'
            }
        });

        // 4. Create Admin User
        console.log('👤 Creating default admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);

        await prisma.user.upsert({
            where: { username: 'admin' },
            update: {},
            create: {
                username: 'admin',
                email: 'admin@carthapos.com',
                password: hashedPassword,
                role: 'ADMIN',
                isActive: true
            }
        });

        // 5. Create Test License
        console.log('📄 Creating test license...');
        // We need to fetch modules we just created to link them
        const restaurantModules = await prisma.module.findMany({
            where: {
                OR: [
                    { isCore: true },
                    { category: 'restaurant' },
                    { name: 'inventory' },
                    { name: 'customer-management' }
                ]
            }
        });

        const testLicense = await prisma.license.upsert({
            where: { licenseKey: 'POS-TEST-LICENSE-2024' },
            update: {},
            create: {
                clientId: testClient.id,
                licenseKey: 'POS-TEST-LICENSE-2024',
                sector: 'restaurant',
                licenseType: 'LIFETIME',
                expirationDate: null,
                isActive: true,
                machineId: null
            }
        });

        // Link modules to license
        for (const module of restaurantModules) {
            await prisma.licenseModule.upsert({
                where: {
                    licenseId_moduleId: {
                        licenseId: testLicense.id,
                        moduleId: module.id
                    }
                },
                update: { isEnabled: true },
                create: {
                    licenseId: testLicense.id,
                    moduleId: module.id,
                    isEnabled: true
                }
            });
        }

        // License Configuration
        await prisma.licenseConfiguration.upsert({
            where: { licenseId: testLicense.id },
            update: {},
            create: {
                licenseId: testLicense.id,
                businessName: 'Restaurant Le Gourmet',
                logo: null,
                primaryColor: '#D97706',
                secondaryColor: '#92400E',
                accentColor: '#F59E0B',
                backgroundColor: '#FFFFFF',
                textColor: '#1F2937',
                currency: 'EUR',
                taxRate: 20.0,
                language: 'fr',
                timezone: 'Europe/Paris'
            }
        });

        console.log('✅ Auto-Seed completed successfully!');

    } catch (error) {
        console.error('❌ Auto-Seed failed:', error);
    }
}

module.exports = autoSeed;
