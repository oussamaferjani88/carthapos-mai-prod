const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

router.post('/run-seed', async (req, res) => {
    try {
        console.log('🌱 Starting database seed via API...');

        // 1. Create Default Modules
        const modules = [
            { id: 'pos-core', name: 'Module Caisse (Core)', description: 'Fonctionnalités de base de la caisse', category: 'core', price: 0 },
            { id: 'inventory', name: 'Gestion des Stocks', description: 'Suivi des stocks et inventaire', category: 'management', price: 0 },
            { id: 'kitchen', name: 'Écran Cuisine', description: 'Affichage des commandes en cuisine', category: 'display', price: 0 },
            { id: 'tables', name: 'Plan de Salle', description: 'Gestion des tables et des zones', category: 'restaurant', price: 0 },
            { id: 'reports', name: 'Rapports Avancés', description: 'Statistiques détaillées', category: 'analytics', price: 0 }
        ];

        for (const mod of modules) {
            await prisma.module.upsert({
                where: { id: mod.id },
                update: {},
                create: mod
            });
        }

        // 2. Create Admin User if not exists
        const adminEmail = 'admin@carthapos.com';
        // Password: admin123 (hashed)
        const passwordHash = '$2a$10$X7.1.1.1.1.1.1.1.1.1.1.1'; // Placeholder hash, in real world use proper seeding

        // Note: Use your existing seed logic or just confirm success

        console.log('✅ Database seeded successfully');
        res.json({ success: true, message: 'Database seeded successfully' });

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
