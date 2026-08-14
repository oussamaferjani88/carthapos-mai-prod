const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Resolve the BI client identity for a request.
 * Single source of identity for all new BI code (plan §4).
 *
 * Order of resolution:
 *  1. Authenticated user (JWT via `verifyToken`/`optionalAuth` → req.user):
 *     the Client row whose `userId` matches the JWT subject.
 *  2. Legacy header `X-User-Id` (kept for the current web-deploy client portal).
 *  3. Legacy `userId` body/query param → Client row via `userId`.
 *
 * Returns the resolved clientId string, or null when the caller is not
 * acting as a specific client (treated as admin / unauthenticated).
 */
async function resolveClientId(req, options = {}) {
  const fallbackUserId =
    options.userId ||
    req.body?.userId ||
    req.query?.userId;

  if (req.user && req.user.id) {
    const client = await prisma.client.findUnique({
      where: { userId: req.user.id },
      select: { id: true },
    });
    if (client) return client.id;
  }

  const headerUserId = req.headers['x-user-id'];
  if (headerUserId) {
    const client = await prisma.client.findUnique({
      where: { userId: headerUserId },
      select: { id: true },
    });
    if (client) return client.id;
    return headerUserId;
  }

  if (fallbackUserId) {
    const client = await prisma.client.findUnique({
      where: { userId: String(fallbackUserId) },
      select: { id: true },
    });
    if (client) return client.id;
  }

  return null;
}

module.exports = { resolveClientId };
