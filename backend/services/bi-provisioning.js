/**
 * BI dashboard provisioning service.
 *
 * Turns a business-type master dashboard into a client-specific Metabase
 * dashboard bound to one tenant, organized under the business-type collection:
 *   1. Resolves the business-type collection (admin-selected, or the collection
 *      that contains the master dashboard, or the registry name mapping).
 *   2. Ensures the fixed "client's dashboard" collection INSIDE the
 *      business-type collection (no global "CarthaPOS Clients" parent), then a
 *      per-client sub-collection named after the client/business where that
 *      client's copy — dashboard plus its charts/cards — all live together.
 *   3. Deep-copies the master dashboard into the per-client collection
 *      (independent cards), naming each copy "{clientName}_{businessType}_{businessName}"
 *      and versioning it (_v2/_v3/...) so the same client can hold several
 *      dashboards for the same business.
 *   4. Bakes the tenant filter `["=", [field tenantId], <tenantId>]` into every
 *      copied card so each client only ever sees their own warehouse rows.
 *
 * Re-provisioning the same BiDashboard row reuses its existing dashboard
 * (idempotent, keeps its version). A NEW dashboard for the same client + business
 * is always versioned: _v2, _v3, ... instead of colliding.
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
 * Resolve the structured identity of a client dashboard:
 *   clientName   — resolved CarthaPOS client name (client.name → clientId)
 *   businessName — resolved business/business name (request.businessName → client.name → clientId)
 *   businessType — the dashboard business type
 */
async function resolveClientDashboardIdentity(prisma, dashboard) {
  const clientName = (dashboard.client && dashboard.client.name) || dashboard.clientId;
  let businessName;
  if (dashboard.upload && dashboard.upload.businessName) {
    // The business name detected from the exported ZIP metadata.json is the
    // most authoritative (what the client actually named their business).
    businessName = dashboard.upload.businessName;
  } else if (dashboard.request && dashboard.request.businessName) {
    businessName = dashboard.request.businessName;
  } else if (dashboard.client && dashboard.client.name) {
    businessName = dashboard.client.name;
  } else {
    businessName = dashboard.clientId;
  }
  return {
    clientName,
    businessName,
    businessType: dashboard.businessType || 'unknown',
  };
}

/**
 * Build the display name for a client's Metabase dashboard + collection:
 *   "{clientName}_{businessType}_{businessName}"
 * e.g. "Wess Tekbes_restaurant_Wess Tekbes".
 */
function buildClientDashboardName(identity) {
  const {
    clientName = '',
    businessType = '',
    businessName = '',
  } = identity || {};
  return [clientName, businessType, businessName]
    .map((part) => String(part).trim())
    .filter(Boolean)
    .join('_');
}

// Matches "{baseName}" (v1, no suffix) or "{baseName}_v{2..}": returns the
// version number for a name that starts with the base, else 0 (not a match).
function versionOfDashboardName(name, baseName) {
  if (!name) return 0;
  if (name === baseName) return 1;
  const re = new RegExp(`^${escapeRegExp(baseName)}_v(\\d+)$`);
  const m = name.match(re);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 2 ? n : 0;
}

function escapeRegExp(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Given the dashboards already present in a client's collection, compute the
 * versioned dashboard name to use for a fresh copy:
 *   baseName            → first occurrence
 *   baseName_v2/_v3/... → subsequent occurrences (highest existing + 1)
 *   excludedIds         → dashboards already owned by this BiDashboard row are
 *                         ignored so re-provisioning the same row stays idempotent.
 */
function resolveVersionedDashboardName(existingDashboards, baseName, excludedIds) {
  const excluded = new Set((excludedIds || []).map((id) => String(id)));
  let maxVersion = 0;
  for (const d of existingDashboards) {
    if (excluded.has(String(d.id))) continue;
    const v = versionOfDashboardName(d.name, baseName);
    if (v > maxVersion) maxVersion = v;
  }
  return maxVersion >= 1 ? `${baseName}_v${maxVersion + 1}` : baseName;
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

  // Resolve the client identity (clientName, businessName, businessType) and
  // build the base display name "{clientName}_{businessType}_{businessName}",
  // used for the per-client Metabase collection. The dashboard inside is named
  // the same, but is versioned (_v2/_v3/...) so the same client can hold
  // multiple dashboards for the same business.
  const identity = await resolveClientDashboardIdentity(prisma, dashboard);
  if (businessName) {
    identity.businessName = businessName;
  }
  const baseName = buildClientDashboardName(identity);
  const targetName = baseName;

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

  // 3. Ensure the fixed "client's dashboard" collection INSIDE the business-type
  //    collection, then a per-client sub-collection named after the client/business.
  //    Each client's copy and its cards/charts live together in their own
  //    sub-collection, so the "client's dashboard" collection stays clean and no
  //    client's items are ever mixed with another's.
  const CLIENT_COLLECTION_NAME = "client's dashboard";
  const clientCollection = await metabaseClient.ensureCollection(CLIENT_COLLECTION_NAME, businessCollection.collectionId);
  const perClientCollection = await metabaseClient.ensureCollection(targetName, clientCollection.id);

  // 4. Reuse existing instance (idempotency).
  //    a) Already persisted on the BiDashboard row and still present in Metabase.
  let provisioned = null;
  let reused = false;
  const containerCollectionId = perClientCollection.id;

  // Dashboards already inside this client's collection — used both to reuse an
  // exact-named copy and to compute the next version for a fresh copy.
  const dashboardsInCollection = await metabaseClient.listDashboards(containerCollectionId, 0, true);

  // a) Reuse the dashboard already persisted on this BiDashboard row and still
  //    present in the client collection (idempotent re-provisioning of the same
  //    row — it keeps its versioned name instead of creating a duplicate).
  if (dashboard.metabaseDashboardId != null) {
    try {
      const existing = await metabaseClient.getDashboard(Number(dashboard.metabaseDashboardId));
      if (existing && String(existing.collection_id) === String(containerCollectionId)) {
        provisioned = existing;
        reused = true;
      }
    } catch (err) {
      // Stale reference (e.g. archived dashboard) — fall through and re-provision.
    }
  }

  // Name for a fresh copy: "{baseName}" first, then "{baseName}_v2/_v3/_4..."
  // so the same client can hold several dashboards for the same business. The
  // row's own persisted dashboard is excluded so reapplying keeps its version.
  const dashboardName = resolveVersionedDashboardName(
    dashboardsInCollection,
    baseName,
    dashboard.metabaseDashboardId != null ? [dashboard.metabaseDashboardId] : [],
  );

  // b) Identical-named dashboard already in the client collection (handles the
  //    case where Metabase succeeded but CarthaPOS persistence failed).
  if (!provisioned) {
    const existingByName = dashboardsInCollection.find((d) => d && d.name === dashboardName);
    if (existingByName) {
      provisioned = await metabaseClient.getDashboard(existingByName.id);
      reused = true;
    }
  }

  if (!provisioned) {
    // 5. Deep copy the master into the per-client collection.
    const created = await metabaseClient.duplicateDashboard(master.id, {
      name: dashboardName,
      collectionId: containerCollectionId,
    });
    // The copy POST response omits dashcards; fetch the dashboard for card queries.
    provisioned = await metabaseClient.getDashboard(created.id);
  }

  // 6. Bake the tenant filter into every copied card (idempotent: cards that
  //    are already tenant-bound are left untouched) and keep every chart inside
  //    the client's own collection.
  const databaseId = firstCardDatabase(provisioned) || firstCardDatabase(master) || Number(process.env.METABASE_DATABASE_ID);
  const tableFieldMap = await metabaseClient.tenantFieldIdByTable(databaseId);

  // Per-run memo: shared nested source question id → this client's duplicated
  // card id. Two wrapper cards referencing the SAME shared card__NN must reuse
  // one per-client copy instead of duplicating it twice. Reset per provision
  // (per tenant), never shared across clients.
  const nestedCardMemo = new Map();

  let cardCount = 0;
  for (const dashcard of (provisioned.dashcards || [])) {
    const card = dashcard.card || dashcard;
    if (!card || card.id == null) continue;
    const datasetQuery = card.dataset_query || (await metabaseClient.getCard(card.id)).dataset_query;
    if (!datasetQuery) continue;

    // Keep the card in the client's own collection (not scattered in the shared
    // "client's dashboard" collection or root).
    try {
      const cardDetail = await metabaseClient.getCard(card.id);
      if (String(cardDetail.collection_id) !== String(containerCollectionId)) {
        await metabaseClient.moveCardToCollection(card.id, containerCollectionId);
      }
    } catch (err) {
      // non-fatal — the card still works, just may live outside the collection.
    }

    const sourceTable = datasetQuery.type === 'query' && datasetQuery.query
      ? datasetQuery.query['source-table']
      : null;

    // Nested question reference: source-table is the STRING "card__NN" (a saved
    // question based on another saved question), not a numeric table id. These
    // nested questions are SHARED across every client and were never tenant
    // filtered — duplicate the referenced question per client, bake the tenant
    // filter into the copy (recursively if it chains further), then repoint this
    // wrapper card at the per-client copy.
    const nestedRef = typeof sourceTable === 'string' && sourceTable.match(/^card__(\d+)$/);
    if (nestedRef) {
      const perClientCardId = await ensureNestedCard({
        originalCardId: Number(nestedRef[1]),
        tenant,
        databaseId,
        tableFieldMap,
        containerCollectionId,
        memo: nestedCardMemo,
        depth: 0,
      });
      const rebaked = JSON.parse(JSON.stringify(datasetQuery));
      rebaked.query['source-table'] = `card__${perClientCardId}`;
      if (JSON.stringify(rebaked) !== JSON.stringify(datasetQuery)) {
        await metabaseClient.updateCardDatasetQuery(card.id, rebaked);
        cardCount += 1;
      }
      continue;
    }

    const tenantFieldId = sourceTable != null ? tableFieldMap[sourceTable] : null;

    const baked = metabaseClient.bakeTenantFilter(datasetQuery, tenantFieldId, tenant);
    if (baked !== datasetQuery) {
      await metabaseClient.updateCardDatasetQuery(card.id, baked);
      cardCount += 1;
    }
  }

  return {
    metabaseDashboardId: provisioned.id,
    collectionId: containerCollectionId,
    collectionName: perClientCollection.name,
    businessCollectionId: businessCollection.collectionId,
    businessCollectionName: businessCollection.collectionName,
    cardCount,
    reused,
    businessName: baseName,
    dashboardName: provisioned.name,
    clientName: identity.clientName,
    businessType: identity.businessType,
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

/**
 * Is `datasetQuery` a reference to another saved question via the card__NN
 * ("question based on a saved question") pattern? Returns the referenced card
 * id (a number) when the MBQL source-table is the STRING "card__NN", else null.
 */
function nestedSourceCardId(datasetQuery) {
  if (!datasetQuery || datasetQuery.type !== 'query' || !datasetQuery.query) return null;
  const st = datasetQuery.query['source-table'];
  if (typeof st !== 'string') return null;
  const m = st.match(/^card__(\d+)$/);
  return m ? Number(m[1]) : null;
}

/**
 * Duplicate a shared nested source question (card__NN) per tenant and bake the
 * tenant filter into the copy, recursively following any further nesting until
 * a real data card (native SQL or MBQL against an actual table) is reached.
 *
 * The memo (per provisionClientDashboard run) guarantees each shared original
 * card is duplicated at most once per client, so multiple wrapper cards that
 * reference the same card__NN all share the same per-client copy.
 *
 * @param {object} opts.originalCardId  shared nested question id to duplicate
 * @returns {Promise<number>} the per-client (tenant-filtered) copy's card id
 */
async function ensureNestedCard({
  originalCardId,
  tenant,
  databaseId,
  tableFieldMap,
  containerCollectionId,
  memo,
  depth,
}) {
  if (depth > 10) {
    throw new Error(`Nested card nesting too deep while provisioning card ${originalCardId}`);
  }
  if (memo.has(originalCardId)) return memo.get(originalCardId);

  const src = await metabaseClient.getCard(originalCardId);
  const srcQuery = src.dataset_query;
  const innerRef = nestedSourceCardId(srcQuery);

  let bakedQuery;
  if (innerRef != null) {
    // This shared question is itself a wrapper chaining to another card — recurse
    // to get that card's per-client copy, then repoint this one at it.
    const innerCopyId = await ensureNestedCard({
      originalCardId: innerRef,
      tenant,
      databaseId,
      tableFieldMap,
      containerCollectionId,
      memo,
      depth: depth + 1,
    });
    bakedQuery = JSON.parse(JSON.stringify(srcQuery));
    bakedQuery.query['source-table'] = `card__${innerCopyId}`;
  } else {
    // Real data card: resolve its actual table's tenant field id (if any) and
    // bake the filter with the (alias-aware) native SQL handling in
    // bakeTenantFilter.
    const innerTable = srcQuery && srcQuery.type === 'query' && srcQuery.query
      ? srcQuery.query['source-table']
      : null;
    const innerTenantFieldId = innerTable != null ? tableFieldMap[innerTable] : null;
    bakedQuery = metabaseClient.bakeTenantFilter(srcQuery, innerTenantFieldId, tenant);
  }

  // Copy the shared question into this client's collection (independent card),
  // then persist the (recursively) tenant-baked query onto the copy.
  const copy = await metabaseClient.duplicateCard(originalCardId, {
    collectionId: containerCollectionId,
    name: `${src.name || `question_${originalCardId}`} (${tenant})`,
  });
  if (JSON.stringify(bakedQuery) !== JSON.stringify(srcQuery)) {
    await metabaseClient.updateCardDatasetQuery(copy.id, bakedQuery);
  }

  memo.set(originalCardId, copy.id);
  return copy.id;
}

module.exports = {
  provisionClientDashboard,
  resolveBusinessName,
  resolveBusinessCollection,
  resolveClientDashboardIdentity,
  buildClientDashboardName,
  resolveVersionedDashboardName,
  versionOfDashboardName,
  BUSINESS_COLLECTIONS,
};
