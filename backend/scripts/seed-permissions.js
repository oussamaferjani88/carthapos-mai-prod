/**
 * CLI wrapper: seeds the RBAC permission catalog and normalizes existing users.
 *
 * Usage: npm run db:seed-permissions
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { seedPermissions, normalizeUsers } = require('../utils/seedPermissions');

const prisma = new PrismaClient();

async function main() {
  const seeded = await seedPermissions(prisma);
  console.log(`✅ Permission catalog seeded: ${seeded} permissions`);

  const changes = await normalizeUsers(prisma);
  if (changes.length) {
    console.log('👤 User normalization changes:');
    changes.forEach((c) => console.log(`   - ${c}`));
  } else {
    console.log('👤 User normalization: no changes needed');
  }
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
