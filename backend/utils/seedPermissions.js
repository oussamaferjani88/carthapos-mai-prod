/**
 * Idempotent RBAC seeding + existing-user normalization.
 *
 *  - seedPermissions(prisma): upserts the permission catalog (app_permissions).
 *  - normalizeUsers(prisma): enforces the canonical-account and role policy:
 *      * canonical SUPER_ADMIN (env ADMIN_INITIAL_USERNAME) stays SUPER_ADMIN + active
 *      * any OTHER user with role SUPER_ADMIN is downgraded to ADMIN
 *      * the legacy default account "admin" (old default credential) is downgraded to MANAGER
 *      * CLIENT accounts are left untouched
 *      * permission rows are cleaned for users who are no longer ADMIN/MANAGER
 *        (so a downgraded user cannot keep admin privileges)
 */
const { PERMISSION_CATALOG } = require('./permissionCatalog');

async function seedPermissions(prisma) {
  const catalog = PERMISSION_CATALOG;
  for (const item of catalog) {
    await prisma.permission.upsert({
      where: { key: item.key },
      update: {
        module: item.module,
        name: item.name,
        description: item.description,
      },
      create: item,
    });
  }
  return catalog.length;
}

async function normalizeUsers(prisma) {
  const canonicalUsername = process.env.ADMIN_INITIAL_USERNAME;
  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true, isActive: true },
  });

  const changes = [];
  const permissionRows = await prisma.userPermission.findMany({
    select: { id: true, userId: true },
  });
  const permissionUserIds = new Set(permissionRows.map((r) => r.userId));

  for (const user of allUsers) {
    const isCanonical = canonicalUsername && user.username === canonicalUsername;

    if (isCanonical) {
      if (user.role !== 'SUPER_ADMIN' || !user.isActive) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: 'SUPER_ADMIN', isActive: true },
        });
        changes.push(`${user.username}: promoted to active SUPER_ADMIN`);
      }
      continue;
    }

    if (user.role === 'SUPER_ADMIN') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' } });
      changes.push(`${user.username}: SUPER_ADMIN -> ADMIN (non-canonical)`);
    }

    // Legacy default account "admin" (default credential) -> MANAGER (least privilege)
    if (user.username === 'admin' && user.role === 'ADMIN') {
      await prisma.user.update({ where: { id: user.id }, data: { role: 'MANAGER' } });
      changes.push(`admin: ADMIN -> MANAGER (legacy default downgraded)`);
    }

    // Clean up permission rows for non-ADMIN/MANAGER users
    if (!['ADMIN', 'MANAGER'].includes(user.role) && permissionUserIds.has(user.id)) {
      await prisma.userPermission.deleteMany({ where: { userId: user.id } });
      changes.push(`${user.username}: permission rows cleared (role ${user.role})`);
    }
  }

  return changes;
}

module.exports = { seedPermissions, normalizeUsers, PERMISSION_CATALOG };
