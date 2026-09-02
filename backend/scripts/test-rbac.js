/**
 * RBAC integration test suite (executed against a running backend).
 * Uses real HTTP requests with HttpOnly-cookie sessions.
 * Prints PASS/FAIL per assertion; exits non-zero if anything fails.
 *
 * Usage: node scripts/test-rbac.js  (backend must be running on :3001)
 */
require('dotenv').config();

const BASE = process.env.TEST_API_URL || 'http://localhost:3001/api';
const ADMIN_INITIAL_USERNAME = process.env.ADMIN_INITIAL_USERNAME;
const ADMIN_INITIAL_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;

let failures = 0;
let passes = 0;
const results = [];

function check(name, cond, extra) {
  if (cond) {
    passes++;
    results.push(`PASS  ${name}${extra ? ` (${extra})` : ''}`);
  } else {
    failures++;
    results.push(`FAIL  ${name}${extra ? ` (${extra})` : ''}`);
  }
}

async function api(method, path, { cookie, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-json */ }
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, json, setCookie };
}

function cookieFrom(res) {
  const raw = res.setCookie;
  if (!raw) return null;
  const match = /pos_admin=([^;]+)/.exec(raw);
  return match ? `pos_admin=${match[1]}` : null;
}

const rand = () => Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);

(async () => {
  if (!ADMIN_INITIAL_USERNAME || !ADMIN_INITIAL_PASSWORD) {
    console.error('ADMIN_INITIAL_USERNAME/PASSWORD not set in backend/.env');
    process.exit(2);
  }

  const username = ADMIN_INITIAL_USERNAME;

  // ── 1. Canonical SUPER_ADMIN login ────────────────────────────────────────
  const loginRes = await api('POST', '/auth/login', { body: { username, password: ADMIN_INITIAL_PASSWORD } });
  const saCookie = cookieFrom(loginRes);
  check('canonical SUPER_ADMIN login', loginRes.status === 200 && !!saCookie, `http ${loginRes.status}`);
  check('canonical login returns full permission catalog', Array.isArray(loginRes.json?.data?.user?.permissions) && loginRes.json.data.user.permissions.includes('licenses.revoke'), `n=${loginRes.json?.data?.user?.permissions?.length}`);
  if (!saCookie) { printResults(); process.exit(1); }

  // ── 2. GET /users (SUPER_ADMIN) ───────────────────────────────────────────
  const listRes = await api('GET', '/users', { cookie: saCookie });
  check('SUPER_ADMIN GET /users -> 200 with permissions arrays', listRes.status === 200 && Array.isArray(listRes.json) && 'permissions' in (listRes.json[0] || {}), `http ${listRes.status}`);

  // ── 3. Create ADMIN with clients.view + clients.create + reports.view ─────
  const adminU = `adm_${rand()}`;
  const createAdmin = await api('POST', '/users', {
    cookie: saCookie,
    body: { username: adminU, email: `${adminU}@test.local`, password: 'AdminPass123!', role: 'ADMIN', permissions: ['clients.view', 'clients.create', 'reports.view'] },
  });
  check('SUPER_ADMIN creates ADMIN user -> 201', createAdmin.status === 201, `http ${createAdmin.status}`);
  const adminId = createAdmin.json?.id;
  check('created ADMIN carries granted permissions', createAdmin.status === 201 && (createAdmin.json?.permissions || []).includes('clients.create'), `perms=${JSON.stringify(createAdmin.json?.permissions)}`);

  // ── 4. Cannot create SUPER_ADMIN through API ──────────────────────────────
  const badSuper = await api('POST', '/users', {
    cookie: saCookie,
    body: { username: `su_${rand()}`, email: `x${rand()}@test.local`, password: 'AdminPass123!', role: 'SUPER_ADMIN' },
  });
  check('POST /users role=SUPER_ADMIN rejected (400)', badSuper.status === 400, `http ${badSuper.status}`);

  // ── 5. ADMIN login + permission enforcement ───────────────────────────────
  const adminLogin = await api('POST', '/auth/login', { body: { username: adminU, password: 'AdminPass123!' } });
  const adminCookie = cookieFrom(adminLogin);
  check('ADMIN login works', adminLogin.status === 200 && !!adminCookie);

  if (adminCookie) {
    const gClients = await api('GET', '/clients', { cookie: adminCookie });
    check('ADMIN GET /clients (clients.view) -> 200', gClients.status === 200, `http ${gClients.status}`);
    const gLicenses = await api('GET', '/licenses', { cookie: adminCookie });
    check('ADMIN GET /licenses (no licenses.view) -> 403', gLicenses.status === 403, `http ${gLicenses.status}`);
    const gUsers = await api('GET', '/users', { cookie: adminCookie });
    check('ADMIN GET /users (SUPER_ADMIN only) -> 403', gUsers.status === 403, `http ${gUsers.status}`);
    const gModules = await api('GET', '/modules', { cookie: adminCookie });
    check('ADMIN GET /modules (no modules.view) -> 403', gModules.status === 403, `http ${gModules.status}`);

    const cCreate = await api('POST', '/clients', {
      cookie: adminCookie,
      body: { name: `Test Client ${rand()}`, email: `client_${rand()}@test.local` },
    });
    check('ADMIN POST /clients (clients.create) -> 201', cCreate.status === 201, `http ${cCreate.status}`);
    const clientId = cCreate.json?.id;

    // ── 6. Escalation attempts must fail ─────────────────────────────────────
    const selfPromote = await api('PUT', `/users/${adminId}`, {
      cookie: adminCookie,
      body: { role: 'SUPER_ADMIN' },
    });
    check('ADMIN self-promote to SUPER_ADMIN -> 403', selfPromote.status === 403, `http ${selfPromote.status}`);
    const selfPermGrant = await api('PUT', `/users/${adminId}/permissions`, {
      cookie: adminCookie,
      body: { permissions: ['users.delete', 'licenses.revoke'] },
    });
    check('ADMIN self-grant users.delete/licenses.revoke -> 403', selfPermGrant.status === 403, `http ${selfPermGrant.status}`);
    const selfDelete = await api('DELETE', `/users/${adminId}`, { cookie: adminCookie });
    check('ADMIN self-delete -> 403', selfDelete.status === 403, `http ${selfDelete.status}`);
    const selfDeactivate = await api('PUT', `/users/${adminId}`, {
      cookie: adminCookie,
      body: { isActive: false },
    });
    check('ADMIN self-deactivate -> 403', selfDeactivate.status === 403, `http ${selfDeactivate.status}`);

    // ── 7. Permission flip: add then remove clients.update ───────────────────
    const addPerm = await api('PUT', `/users/${adminId}/permissions`, {
      cookie: saCookie,
      body: { permissions: ['clients.view', 'clients.create', 'reports.view', 'clients.update'] },
    });
    check('SUPER_ADMIN adds clients.update -> 200', addPerm.status === 200, `http ${addPerm.status}`);
    const updOk = clientId
      ? await api('PUT', `/clients/${clientId}`, { cookie: adminCookie, body: { name: 'Updated by admin' } })
      : null;
    check('ADMIN PUT /clients/:id with clients.update -> 200', updOk?.status === 200, `http ${updOk?.status}`);

    const removePerm = await api('PUT', `/users/${adminId}/permissions`, {
      cookie: saCookie,
      body: { permissions: ['clients.view', 'clients.create', 'reports.view'] },
    });
    check('SUPER_ADMIN removes clients.update -> 200', removePerm.status === 200, `http ${removePerm.status}`);
    const updBlocked = clientId
      ? await api('PUT', `/clients/${clientId}`, { cookie: adminCookie, body: { name: 'Should fail' } })
      : null;
    check('ADMIN PUT /clients/:id without clients.update -> 403', updBlocked?.status === 403, `http ${updBlocked?.status}`);

    // cleanup client created by admin
    if (clientId) await api('DELETE', `/clients/${clientId}`, { cookie: saCookie });

    // ── 8. MANAGER role + enforcement ────────────────────────────────────────
    const mgrU = `mgr_${rand()}`;
    const createMgr = await api('POST', '/users', {
      cookie: saCookie,
      body: { username: mgrU, email: `${mgrU}@test.local`, password: 'ManagerPass123!', role: 'MANAGER', permissions: ['products.view', 'inventory.view', 'inventory.edit'] },
    });
    check('SUPER_ADMIN creates MANAGER -> 201', createMgr.status === 201, `http ${createMgr.status}`);

    const mgrLogin = await api('POST', '/auth/login', { body: { username: mgrU, password: 'ManagerPass123!' } });
    const mgrCookie = cookieFrom(mgrLogin);
    check('MANAGER login works', mgrLogin.status === 200 && !!mgrCookie);
    if (mgrCookie) {
      const mgrClients = await api('GET', '/clients', { cookie: mgrCookie });
      check('MANAGER GET /clients (no clients.view) -> 403', mgrClients.status === 403, `http ${mgrClients.status}`);
      const mgrUsers = await api('GET', '/users', { cookie: mgrCookie });
      check('MANAGER GET /users -> 403', mgrUsers.status === 403, `http ${mgrUsers.status}`);
      const mgrPermEdit = await api('PUT', `/users/${adminId}/permissions`, { cookie: mgrCookie, body: { permissions: [] } });
      check('MANAGER cannot edit permissions (own or others) -> 403', mgrPermEdit.status === 403, `http ${mgrPermEdit.status}`);
      // cleanup manager
      await api('DELETE', `/users/${createMgr.json?.id}`, { cookie: saCookie });
    }
  }

  // ── 9. Canonical SUPER_ADMIN protection ───────────────────────────────────
  const canonical = await api('GET', '/users', { cookie: saCookie });
  const canonicalUser = (canonical.json || []).find((u) => u.username === username);
  check('canonical account present in user list', !!canonicalUser);

  if (canonicalUser) {
    const demote = await api('PUT', `/users/${canonicalUser.id}`, { cookie: saCookie, body: { role: 'ADMIN' } });
    check('canonical self-demotion -> 403', demote.status === 403, `http ${demote.status}`);
    const deactivate = await api('PUT', `/users/${canonicalUser.id}`, { cookie: saCookie, body: { isActive: false } });
    check('canonical self-deactivation -> 403', deactivate.status === 403, `http ${deactivate.status}`);
    const deleteCanonical = await api('DELETE', `/users/${canonicalUser.id}`, { cookie: saCookie });
    check('canonical deletion -> 400', deleteCanonical.status === 400, `http ${deleteCanonical.status}`);
    const permEditCanonical = await api('PUT', `/users/${canonicalUser.id}/permissions`, { cookie: saCookie, body: { permissions: [] } });
    check('canonical permission change -> 403', permEditCanonical.status === 403, `http ${permEditCanonical.status}`);
  }

  // ── 10. Public / portal / POS endpoints stay open (no cookie) ─────────────
  const pubLicenses = await api('GET', '/licenses');
  check('GET /licenses without cookie -> 200 (portal/POS)', pubLicenses.status === 200, `http ${pubLicenses.status}`);
  const pubClients = await api('GET', '/clients');
  check('GET /clients without cookie -> 200 (portal)', pubClients.status === 200, `http ${pubClients.status}`);
  const pubModules = await api('GET', '/modules');
  check('GET /modules without cookie -> 200 (portal)', pubModules.status === 200, `http ${pubModules.status}`);
  const pubStats = await api('GET', '/users/stats');
  check('GET /users/stats without cookie -> 401 (no session)', pubStats.status === 401, `http ${pubStats.status}`);

  // ── 11. Cleanup: remove the ADMIN test user (via SUPER_ADMIN) ─────────────
  if (adminId) {
    const del = await api('DELETE', `/users/${adminId}`, { cookie: saCookie });
    check('SUPER_ADMIN deletes test ADMIN -> 200', del.status === 200, `http ${del.status}`);
  }

  printResults();
})().catch((e) => {
  console.error('Test run crashed:', e);
  process.exit(1);
});

function printResults() {
  console.log('\n==================================================');
  results.forEach((r) => console.log(r));
  console.log('==================================================');
  console.log(`\n${passes} passed, ${failures} failed`);
  process.exit(failures ? 1 : 0);
}
