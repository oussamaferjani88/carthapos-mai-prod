/**
 * Create or update the initial SUPER_ADMIN account.
 *
 * Reads ADMIN_INITIAL_USERNAME / ADMIN_INITIAL_PASSWORD from the environment
 * (or a .env file via dotenv). The plaintext password is ONLY used at creation
 * time to compute a bcrypt hash — it is never written to any file or logged.
 *
 * Usage: npm run db:create-admin
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const username = process.env.ADMIN_INITIAL_USERNAME;
  const password = process.env.ADMIN_INITIAL_PASSWORD;

  if (!username || !password) {
    console.error(
      '❌ ADMIN_INITIAL_USERNAME and ADMIN_INITIAL_PASSWORD must be set ' +
      '(add them to backend/.env — it is gitignored).'
    );
    process.exit(1);
  }
  if (username.length < 3 || password.length < 8) {
    console.error('❌ Username must be >= 3 chars and password >= 8 chars.');
    process.exit(1);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      username,
      email: `${username}@carthapos.local`,
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    select: { id: true, username: true, email: true, role: true, isActive: true },
  });

  console.log(`✅ SUPER_ADMIN account ready: ${user.username} (role=${user.role}, active=${user.isActive})`);
}

main()
  .catch((error) => {
    console.error('❌ Failed to create admin account:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
