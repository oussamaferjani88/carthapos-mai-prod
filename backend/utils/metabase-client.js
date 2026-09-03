/**
 * Thin Metabase REST API client.
 *
 * Discovers collections and dashboards directly from Metabase so the backend
 * never hardcodes businessType -> dashboardId mappings. Session-based auth
 * (POST /api/session) using METABASE_USER / METABASE_PASSWORD. Degrades
 * gracefully (returns empty lists) when Metabase is not configured.
 */

const BASE_URL = process.env.METABASE_BASE_URL || 'http://localhost:3000';
const MB_USER = process.env.METABASE_USER || '';
const MB_PASSWORD = process.env.METABASE_PASSWORD || '';

let sessionToken = null;
let tokenExpiresAt = 0;

function isConfigured() {
  return !!(MB_USER && MB_PASSWORD);
}

async function request(path, { method = 'GET', body = null, token = null } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Metabase-Session'] = token;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  if (!res.ok) {
    throw new Error(`Metabase API ${method} ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function getSession() {
  if (sessionToken && Date.now() < tokenExpiresAt) return sessionToken;
  const data = await request('/api/session', {
    method: 'POST',
    body: { username: MB_USER, password: MB_PASSWORD },
  });
  sessionToken = data.id || null;
  // Metabase sessions are long-lived; refresh after 12h to be safe.
  tokenExpiresAt = Date.now() + 12 * 60 * 60 * 1000;
  return sessionToken;
}

/**
 * List all collections. Returns [{ id, name, archived, ... }] filtered to
 * non-archived collections only.
 */
async function listCollections() {
  if (!isConfigured()) return [];
  const token = await getSession();
  const data = await request('/api/collection', { token });
  const items = Array.isArray(data) ? data : [];
  return items
    .filter((c) => c && !c.archived)
    .map((c) => ({ id: c.id, name: c.name, personal_owner_id: c.personal_owner_id || null, archived: !!c.archived }));
}

/**
 * List dashboards inside a collection. With directOnly=false it recurses into
 * nested sub-collections; Metabase returns typed items and only
 * model === 'dashboard' is kept (Questions/cards, Documentation and nested
 * collections are excluded). Dashboards found deeper in the tree are labelled
 * with their path so the admin UI can disambiguate same-named dashboards.
 * With directOnly=true only dashboards directly in the given collection are
 * returned (used to pick a master from a business-type collection).
 */
async function listDashboards(collectionId, _depth = 0, directOnly = false) {
  if (!isConfigured() || _depth > 10) return [];
  const token = await getSession();

  let items = [];
  try {
    const data = await request(`/api/collection/${collectionId}/items`, { token });
    items = Array.isArray(data) ? data : (data && data.data) || [];
  } catch (err) {
    return [];
  }

  const results = [];
  const pathNames = [];

  for (const item of items) {
    if (!item) continue;
    if (item.model === 'dashboard') {
      results.push({
        id: item.id,
        name: item.name,
        description: item.description || null,
        model: item.model,
        collectionName: item.collection?.name || pathNames.join('/') || null,
      });
    } else if (item.model === 'collection' && !directOnly) {
      const nested = await listDashboards(item.id, _depth + 1);
      for (const d of nested) {
        results.push({ ...d, collectionName: `${item.name}${d.collectionName ? '/' + d.collectionName : ''}` });
      }
    }
  }
  return results;
}

/**
 * Move a dashboard into a target collection.
 * PUT /api/dashboard/:id accepts a collection_id payload on Metabase 0.52.x.
 */
async function moveDashboard(dashboardId, collectionId) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/dashboard/${dashboardId}`, {
    method: 'PUT',
    body: { collection_id: collectionId },
    token,
  });
  if (!data || !data.id) throw new Error(`Failed to move Metabase dashboard ${dashboardId}`);
  return data;
}

/**
 * Ensure a dashboard has a public link and return its public UUID.
 * GET /api/dashboard/:id returns public_uuid when public sharing is enabled;
 * POST /api/dashboard/:id/public_link creates it idempotently.
 */
async function getPublicLink(dashboardId) {
  if (!isConfigured()) return null;
  const token = await getSession();
  try {
    const detail = await request(`/api/dashboard/${dashboardId}`, { token });
    if (detail && detail.public_uuid) return detail.public_uuid;
  } catch (err) {
    // fall through to create below
  }
  const created = await request(`/api/dashboard/${dashboardId}/public_link`, { method: 'POST', token });
  return (created && (created.id || created.uuid)) || null;
}

// ─── Provisioning helpers ──────────────────────────────────────

/**
 * Fetch a single collection by id.
 * GET /api/collection/:id returns the full collection object including
 * `location` (path of parent ids) and `parent_id`.
 */
async function getCollection(collectionId) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/collection/${collectionId}`, { token });
  if (!data || data.archived) throw new Error(`Metabase collection ${collectionId} not found or archived`);
  return data;
}

/**
 * Find a collection by name, optionally constrained to a specific parent.
 * parentId null/undefined matches top-level collections (location '/');
 * otherwise matches collections whose location ends with `/{parentId}/`.
 * Returns null when no match exists (never creates).
 */
async function findCollectionByName(name, parentId = null) {
  if (!isConfigured()) return null;
  const token = await getSession();
  const data = await request('/api/collection', { token });
  const items = Array.isArray(data) ? data : [];
  const parentPath = parentId != null ? `/${parentId}/` : null;
  for (const c of items) {
    if (!c || c.archived) continue;
    if (c.name !== name) continue;
    const location = c.location || (c.parent_id == null ? '/' : `/${c.parent_id}/`);
    if (parentId == null) {
      if (location === '/' || location === '' || location === null || location === undefined) return c;
    } else if (location === parentPath || location === `/${parentId}` || location.endsWith(parentPath)) {
      return c;
    }
  }
  return null;
}

/**
 * Create a collection. parentId null creates a top-level collection.
 */
async function createCollection(name, parentId = null) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const body = { name };
  if (parentId != null) body.parent_id = parentId;
  const data = await request('/api/collection', { method: 'POST', body, token });
  return data;
}

/**
 * Find a collection by name (and parent), creating it only if missing.
 * Idempotent: never creates a duplicate (no "name 2").
 */
async function ensureCollection(name, parentId = null) {
  const existing = await findCollectionByName(name, parentId);
  if (existing) return existing;
  const created = await createCollection(name, parentId);
  if (!created || !created.id) throw new Error(`Failed to create Metabase collection "${name}"`);
  return created;
}

/**
 * Fetch a single dashboard by id, including its dashcards with card queries.
 */
async function getDashboard(dashboardId) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/dashboard/${dashboardId}`, { token });
  if (!data || data.archived) throw new Error(`Metabase dashboard ${dashboardId} not found or archived`);
  return data;
}

/**
 * Deep-copy a dashboard into a target collection.
 * is_deep_copy:true creates fully independent cards (new card ids) placed in
 * the target collection — verified on v0.52.4. Returns the new dashboard.
 */
async function duplicateDashboard(dashboardId, { name, collectionId }) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/dashboard/${dashboardId}/copy`, {
    method: 'POST',
    body: { name, collection_id: collectionId, is_deep_copy: true },
    token,
  });
  if (!data || !data.id) throw new Error(`Failed to deep-copy Metabase dashboard ${dashboardId}`);
  return data;
}

/**
 * Copy a single card (saved question) into a target collection.
 * POST /api/card/:id/copy accepts an optional { name, collection_id } body.
 * Used to duplicate a nested source question (card__NN) per client so each
 * tenant gets their own independent, tenant-filtered copy instead of all
 * clients sharing one unfiltered question. Returns the new card.
 */
async function duplicateCard(cardId, { name, collectionId }) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const body = {};
  if (name) body.name = name;
  if (collectionId != null) body.collection_id = Number(collectionId);
  const data = await request(`/api/card/${cardId}/copy`, {
    method: 'POST',
    body,
    token,
  });
  if (!data || !data.id) throw new Error(`Failed to copy Metabase card ${cardId}`);
  return data;
}

/**
 * Find a dashboard by name inside a collection (direct children only).
 * Used for idempotent provisioning: retry reuses the previously created copy.
 */
async function findDashboardByName(collectionId, name) {
  if (!isConfigured()) return null;
  const token = await getSession();
  const data = await request(`/api/collection/${collectionId}/items`, { token });
  const items = Array.isArray(data) ? data : (data && data.data) || [];
  for (const item of items) {
    if (item && item.model === 'dashboard' && item.name === name && !item.archived) {
      return item;
    }
  }
  return null;
}

/**
 * Fetch a single card (includes its dataset_query).
 */
async function getCard(cardId) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/card/${cardId}`, { token });
  if (!data || data.archived) throw new Error(`Metabase card ${cardId} not found or archived`);
  return data;
}

/**
 * Update a card's dataset_query. Used to bake the tenant filter into each
 * copied card so the client dashboard only ever queries that tenant's rows.
 */
async function updateCardDatasetQuery(cardId, datasetQuery) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/card/${cardId}`, {
    method: 'PUT',
    body: { dataset_query: datasetQuery },
    token,
  });
  return data;
}

/**
 * Move a card (saved question/chart) into a target collection so each client's
 * dashboard and its charts live together inside that client's own collection.
 */
async function moveCardToCollection(cardId, collectionId) {
  if (!isConfigured()) throw new Error('Metabase is not configured');
  const token = await getSession();
  const data = await request(`/api/card/${cardId}`, {
    method: 'PUT',
    body: { collection_id: collectionId },
    token,
  });
  return data;
}

/**
 * Fetch database metadata and build { tableId: { tenantFieldId } } by locating
 * the field named 'tenantId' (or 'tenantid') in each table.
 */
async function tenantFieldIdByTable(databaseId) {
  if (!isConfigured()) return {};
  const token = await getSession();
  const metadata = await request(`/api/database/${databaseId}/metadata`, { token });
  const tables = (metadata && metadata.tables) || [];
  const map = {};
  for (const t of tables) {
    const fields = (t && t.fields) || [];
    const tenant = fields.find((f) => (f.name || '').toLowerCase() === 'tenantid');
    if (tenant) map[t.id] = tenant.id;
  }
  return map;
}

/**
 * Bake a tenant filter into a card's dataset_query.
 *  - MBQL cards (type 'query'): adds `filter` = `["=", [field tenantFieldId, ...], tenantId]`
 *    merging with any existing filter via AND.
 *  - Native SQL cards (type 'native'): injects `WHERE "tenantId" = '<v>'` after
 *    the FROM table reference (templates contain no existing WHERE clause).
 * Returns the new dataset_query (or the original untouched when already baked).
 */
function bakeTenantFilter(datasetQuery, tenantFieldId, tenantId) {
  if (!datasetQuery) return datasetQuery;
  const escaped = String(tenantId).replace(/'/g, "''");
  const q = JSON.parse(JSON.stringify(datasetQuery));

  if (q.type === 'query' && q.query && tenantFieldId != null) {
    const already = JSON.stringify(q.query).includes(`"${tenantId}"`);
    if (already) return datasetQuery;
    const tenantFilter = ['=', ['field', tenantFieldId, { 'base-type': 'type/Text' }], tenantId];
    if (q.query.filter) {
      q.query.filter = ['and', q.query.filter, tenantFilter];
    } else {
      q.query.filter = tenantFilter;
    }
    return q;
  }

  if (q.type === 'native' && q.native && q.native.query) {
    const sql = q.native.query;
    if (sql.includes('"tenantId"') || sql.toLowerCase().includes('tenantid')) return datasetQuery;
    // Match FROM + table reference + an OPTIONAL alias (bare word, optionally
    // after AS). Consuming the alias is essential — `FROM public.fact_sales f
    // JOIN ...` must become `FROM public.fact_sales f WHERE ... JOIN ...`, not
    // `FROM public.fact_sales WHERE ... f JOIN ...` (invalid SQL).
    const m = sql.match(/FROM\s+([a-zA-Z0-9_"\[\]\.]+)(\s+(?:AS\s+)?[a-zA-Z_][a-zA-Z0-9_]*)?/i);
    if (!m) return datasetQuery;
    const insertAt = m.index + m[0].length;
    // If the query already carries its own WHERE clause (not expected in the
    // generated templates, but don't corrupt it if present), inject INTO that
    // clause rather than emitting a second WHERE keyword.
    const whereMatch = sql.slice(insertAt).match(/\bWHERE\b/i);
    if (whereMatch) {
      const whereIdx = insertAt + whereMatch.index;
      q.native.query =
        `${sql.slice(0, whereIdx + whereMatch[0].length)} "tenantId" = '${escaped}' AND` +
        `${sql.slice(whereIdx + whereMatch[0].length)}`;
    } else {
      q.native.query = `${sql.slice(0, insertAt)} WHERE "tenantId" = '${escaped}'${sql.slice(insertAt)}`;
    }
    return q;
  }

  return datasetQuery;
}

module.exports = {
  isConfigured,
  listCollections,
  listDashboards,
  getPublicLink,
  getSession,
  getCollection,
  findCollectionByName,
  createCollection,
  ensureCollection,
  getDashboard,
  moveDashboard,
  duplicateDashboard,
  duplicateCard,
  findDashboardByName,
  getCard,
  updateCardDatasetQuery,
  moveCardToCollection,
  tenantFieldIdByTable,
  bakeTenantFilter,
};
