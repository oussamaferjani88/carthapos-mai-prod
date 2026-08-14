/**
 * BI dashboard provisioning service.
 *
 * Turns a business-type master dashboard into a client-specific Metabase
 * dashboard bound to one tenant, organized under the business-type collection:
 *   1. Resolves the business-type collection (admin-selected, or the collection
 *      that contains the master dashboard, or the registry name mapping).
 *   2. Ensures a per-client collection named after the canonical business name
 *      INSIDE the business-type collection (no global "CarthaPOS Clients" parent).
 *   3. Deep-copies the master dashboard into that collection (independent cards).
 *   4. Bakes the tenant filter `["=", [field tenantId], <tenantId>]` into every
 *      copied card so each client only ever sees their own warehouse rows.
 *
 * Idempotent by design: retries reuse an existing Metabase dashboard (either the
 * one already persisted on the BiDashboard row, or an identical-named dashboard
 * inside the client collection) instead of creating "Dashboard A, B, C".
 *
 * The master template is NEVER modified — it stays reusable for all clients.
 */

const metabaseClient = require('../utils/metabase-client');

// Fallback name mapping businessType → Metabase business-type collection name.
// Only used when the master dashboard does not exist in Metabase yet (so its
// containing collection cannot be discovered) — used to locate the namespace
// for the admin flow and to give clear errors.
const BUSINESS_COLLECTIONS = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bakery: 'Boulangerie',
  retail: 'Retail',
  pharmacy: 'Pharmacy',
  salon: 'Salon',
  hotel: 'Hotel',
};

/**
 * Resolve the business-type Metabase collection for a template.
 *
 * Priority:
 *   1. admin-selected businessCollectionId (from the admin UI),
 *   2. the collection that directly contains the registered master dashboard
 *      (self-healing: business collection == master's home),
 *   3. the registry name mapping (BUSINESS_COLLECTIONS) — only when the master
 *      does not exist in Metabase yet.
 *
 * Returns null when no business collection can be resolved.
 */
async function resolveBusinessCollection({ businessCollectionId, masterId, businessType }) {
  if (businessCollectionId != null) {
    const coll = await metabaseClient.getCollection(Number(businessCollectionId));
    return { collectionId: coll.id, collectionName: coll.name, source: 'admin' };
  }
  if (masterId != null) {
    try {
      const master = await metabaseClient.getDashboard(Number(masterId));
      if (master && master.collection_id != null) {
        const coll = await metabaseClient.getCollection(master.collection_id);
        return { collectionId: coll.id, collectionName: coll.name, source: 'master' };
      }
    } catch (err) {
      // master does not exist (placeholder) — fall through to name mapping.
    }
  }
  const fallbackName = BUSINESS_COLLECTIONS[businessType];
  if (fallbackName) {
    const coll = await metabaseClient.findCollectionByName(fallbackName, null);
    if (coll) return { collectionId: coll.id, collectionName: coll.name, source: 'name' };
  }
  return null;
}

/**
 * Resolve the canonical business/client name used for the collection name.
 * Priority: linked request businessName → CarthaPOS client name → clientId.
 * Never invents a new identifier.
 */
async function resolveBusinessName(prisma, dashboard) {
  if (dashboard.request && dashboard.request.businessName) {
    return dashboard.request.businessName;
  }
  if (dashboard.client && dashboard.client.name) {
    return dashboard.client.name;
  }
  return dashboard.clientId;
}

/**
 * Provision a client-specific Metabase dashboard from the registered template.
 *
 * @param {object} opts
 * @param {object} opts.prisma             Prisma client
 * @param {object} opts.dashboard          BiDashboard (with .clientId, .businessType)
 * @param {object} opts.template           BiDashboardTemplate (with .businessType, .name, .metabaseDashboardId)
 * @param {number} [opts.masterDashboardId] admin-selected master Metabase dashboard id (defaults to template's)
 * @param {number} [opts.businessCollectionId] admin-selected business-type collection id
 * @param {string} [opts.tenantId]         warehouse tenantId (defaults to dashboard.clientId)
 * @param {string} [opts.businessName]     canonical business name (resolved if omitted)
 * @returns {Promise<{metabaseDashboardId:number, collectionId:number,
 *                    collectionName:string, businessCollectionId:number,
 *                    businessCollectionName:string, cardCount:number,
 *                    reused:boolean, businessName:string}>}
 */
async function provisionClientDashboard({
  prisma,
  dashboard,
  template,
  masterDashboardId,
  businessCollectionId,
  tenantId,
  businessName,
}) {
  if (!metabaseClient.isConfigured()) {
    throw new Error('Metabase is not configured (METABASE_USER/METABASE_PASSWORD missing).');
  }
  if (!template || template.metabaseDashboardId == null) {
    throw new Error(`No Metabase master template registered for businessType "${dashboard.businessType}".`);
  }

  const masterId = Number(masterDashboardId != null ? masterDashboardId : template.metabaseDashboardId);
  const tenant = tenantId || dashboard.clientId;
  const resolvedName = businessName || (await resolveBusinessName(prisma, dashboard));

  // 1. Master template must actually exist in Metabase.
  let master;
  try {
    master = await metabaseClient.getDashboard(masterId);
  } catch (err) {
    throw new Error(
      `No master dashboard template is configured for this business type. ` +
        `Master Metabase dashboard ${masterId} not found for "${template.businessType}".`
    );
  }

  // 2. Resolve the business-type collection (idempotent, never creates).
  const businessCollection = await resolveBusinessCollection({
    businessCollectionId,
    masterId: master.id,
    businessType: template.businessType,
  });
  if (!businessCollection) {
    throw new Error(
      `No master dashboard template is configured for this business type. ` +
        `Could not resolve the business-type Metabase collection for "${template.businessType}".`
    );
  }

  // 3. Ensure the per-client collection INSIDE the business-type collection.
  const clientCollection = await metabaseClient.ensureCollection(resolvedName, businessCollection.collectionId);

  // 4. Reuse existing instance (idempotency).
  //    a) Already persisted on the BiDashboard row and still present in Metabase.
  let provisioned = null;
  let reused = false;
  if (dashboard.metabaseDashboardId != null) {
    try {
      const existing = await metabaseClient.getDashboard(Number(dashboard.metabaseDashboardId));
      if (existing && String(existing.collection_id) === String(clientCollection.id)) {
        provisioned = existing;
        reused = true;
      }
    } catch (err) {
      // Stale reference (e.g. archived dashboard) — fall through and re-provision.
    }
  }

  //    b) Identical-named dashboard already in the client collection (handles
  //       the case where Metabase succeeded but CarthaPOS persistence failed).
  const targetName = master.name;
  if (!provisioned) {
    const existingByName = await metabaseClient.findDashboardByName(clientCollection.id, targetName);
    if (existingByName) {
      provisioned = await metabaseClient.getDashboard(existingByName.id);
      reused = true;
    }
  }

  if (!provisioned) {
    // 5. Deep copy the master into the client collection.
    const created = await metabaseClient.duplicateDashboard(master.id, {
      name: targetName,
      collectionId: clientCollection.id,
    });
    // The copy POST response omits dashcards; fetch the dashboard for card queries.
    provisioned = await metabaseClient.getDashboard(created.id);
  }

  // 6. Bake the tenant filter into every copied card (idempotent: cards that
  //    are already tenant-bound are left untouched).
  const databaseId = firstCardDatabase(provisioned) || firstCardDatabase(master) || Number(process.env.METABASE_DATABASE_ID);
  const tableFieldMap = await metabaseClient.tenantFieldIdByTable(databaseId);
  let cardCount = 0;
  for (const dashcard of (provisioned.dashcards || [])) {
    const card = dashcard.card || dashcard;
    if (!card || card.id == null) continue;
    const datasetQuery = card.dataset_query || (await metabaseClient.getCard(card.id)).dataset_query;
    if (!datasetQuery) continue;

    const sourceTable = datasetQuery.type === 'query' && datasetQuery.query
      ? datasetQuery.query['source-table']
      : null;
    const tenantFieldId = sourceTable != null ? tableFieldMap[sourceTable] : null;

    const baked = metabaseClient.bakeTenantFilter(datasetQuery, tenantFieldId, tenant);
    if (baked !== datasetQuery) {
      await metabaseClient.updateCardDatasetQuery(card.id, baked);
      cardCount += 1;
    }
  }

  return {
    metabaseDashboardId: provisioned.id,
    collectionId: clientCollection.id,
    collectionName: resolvedName,
    businessCollectionId: businessCollection.collectionId,
    businessCollectionName: businessCollection.collectionName,
    cardCount,
    reused,
    businessName: resolvedName,
  };
}

/**
 * Return the `database` id referenced by the first query card of a dashboard,
 * used to look up tenantId field ids for filter baking.
 */
function firstCardDatabase(dashboard) {
  for (const dashcard of (dashboard.dashcards || [])) {
    const card = dashcard.card || dashcard;
    const dq = card && card.dataset_query;
    if (dq && dq.database != null) return dq.database;
  }
  return null;
}

module.exports = {
  provisionClientDashboard,
  resolveBusinessName,
  resolveBusinessCollection,
  BUSINESS_COLLECTIONS,
};
