# BI Real Authentication Implementation Report

## 1. Objective
Replace the client portal's mock authentication with the real backend auth flow. A logged-in client is now a real `User` + `Client` row, identity is carried by a real JWT, BI requests are owned by the authenticated client, and stale `localStorage` identities no longer leak between sessions.

## 2. Files Modified

### Frontend
| File | Change |
| --- | --- |
| `frontend/src/lib/auth.ts` (NEW) | Single auth source: JWT token + user + client in `authToken`/`authUser`/`authClient`, `saveAuthSession`, `clearAccessModeIdentity`, `clearAuth`, `apiLogin` (POST `/api/auth/login`), `apiRegister` (POST `/api/auth/register`), `isAuthenticated`. Writes a live legacy `localStorage.user` mirror so existing legacy readers keep working. |
| `frontend/src/lib/bi-client.ts` | `getStoredUser()`/`getIdentityUserId()`/`resolveClientId()` prefer `authClient` → `authUser`; `currentUserId` only honored under explicit AccessMode (`accessMode==='user'`); `biFetch` attaches `Authorization: Bearer <token>`; re-exports `clearAuth`. |
| `frontend/src/lib/api.ts` | Axios request interceptor attaches `Authorization: Bearer <token>`; `X-User-Id` only under explicit AccessMode, else falls back to auth identity. |
| `frontend/src/pages/Login.tsx` | `handleSubmit` → `apiLogin` → `saveAuthSession` → `clearAccessModeIdentity` → `/dashboard`. Mock fabricated profile removed. |
| `frontend/src/pages/Register.tsx` | `handleSubmit` → `apiRegister` (maps fullName/email/businessName/phone) → `saveAuthSession` → `/dashboard` or `/verification-pending`. Mock console.log removed. |
| `frontend/src/components/DashboardLayout.tsx` | Sidebar identity built from `getAuthUser()`/`getAuthClient()` (client name/email win); `handleLogout` → `clearAuth()`. |
| `frontend/src/contexts/AccessModeContext.tsx` | AccessMode activates ONLY via URL `mode`/`userId` params; no-param → reset to admin; provider unmount drops the identity so it never survives into a real session. |
| `frontend/src/pages/dashboard/BIDashboardViewer.tsx` | **P1 fix**: was sending `user.id` (a userId) as `clientId`. Now `loadData`/`handleMarkAllRead` use `resolveClientId()` → the authenticated client's real id. |
| `frontend/src/pages/dashboard/Dashboard.tsx` | `getPortalUser` prefers auth identity before `localStorage.user` fallback (kept for legacy). |

### Backend
| File | Change |
| --- | --- |
| `backend/server.js` | `optionalAuth` now mounted on ALL BI routes (`bi-requests`, `bi-uploads`, `bi/debug`, `bi/dashboards`, `bi/dashboard`, `bi/dashboard-templates`, `bi/notifications`, `bi/analysis`, `bi/analytics`, `bi/reviews`, `bi/review`, `bi/assignments`, `bi/stats`) so JWT populates `req.user`. |
| `backend/routes/bi-requests.js` | GET `/` list: `resolveClientId(req)` identity is forced; a spoofed query `clientId` can no longer widen the scope. |
| `backend/routes/bi-notifications.js` | `read-all` + `unread-count`: identity wins over body/query `clientId`. |

## 3. Auth Flow — Before vs After
- **Before (mock):** `Login.tsx`/`Register.tsx` never hit the backend; they fabricated a fake profile object, wrote it to `localStorage.user`, and `AccessModeContext` (from Phase-4 E2E URL params) persisted `currentUserId/currentUserName/currentUserEmail`. BI requests resolved identity from that stale `currentUserId`, so a real logged-in client's requests were attributed to an unrelated test client ("E2E Phase4 Client", id `cmsgdpeti0000h8aoj1c670lt`).
- **After (real):** Register creates a real `User` (role CLIENT, bcrypt) + linked `Client` (via `Client.userId`). Login validates against the DB and returns a JWT (`{ id, username, email, role }`, 7d, issuer `CarthaPos`). The JWT is the single source of truth; BI routes run `optionalAuth` so `req.user` is set; `resolveClientId` prioritizes JWT identity over any header/body/query value.

## 4. localStorage Keys — Now Used
- `authToken`, `authUser`, `authClient` — real session (set by `saveAuthSession`, removed by `clearAuth`).
- `user` / `isAuthenticated` — live mirror of the real session (kept only for legacy readers; cleared on logout).
- `currentUserId`, `currentUserName`, `currentUserEmail`, `accessMode` — AccessMode test-only; written ONLY on explicit URL params, cleared on normal login/register/logout and on provider unmount. Never resurrected without URL params.

## 5. JWT Flow
Client stores JWT in `authToken`; `biFetch` and axios attach `Authorization: Bearer <token>`; backend `verifyToken` (via `optionalAuth`) populates `req.user`; `resolveClientId` maps the JWT user → `Client` by `userId` and uses `client.id` for all BI scoping. If the JWT's user has no `Client` row, `resolveClientId` falls back to the raw user id, so no request is ever attributed to another client.

## 6. Verification
All verified live against the running backend:

| Scenario | Result |
| --- | --- |
| Register creates real User + Client | `User` id `cmshgos2t0000r012zhszg335` (role CLIENT) + `Client` id `cmshgos3y0002r012xf0kwdut` (`name: "Oussama Resto"`, `userId` FK set) |
| Login authenticates against backend | `POST /api/auth/login` → JWT (exp 7d, role CLIENT); `/api/auth/me` returns the real user + client |
| BI request ownership | `POST /api/bi-requests` with JWT → `clientId` auto-set to the authenticated client |
| Tenant isolation (list) | Client list with JWT → only own requests; spoofing `?clientId=<other>` still returns only own |
| Tenant isolation (detail) | Foreign request detail → `"This request does not belong to your client"` |
| ZIP upload | Upload rejected without .zip; valid ZIP accepted, stored, visible to admin with correct `clientId` |
| Frontend build | `npx tsc --noEmit` clean; `npm run build` succeeds |

## 7. Engine Files — Untouched
Per the hard rule, this task did NOT modify: `backend/services/*`, the ETL pipeline, warehouse, analytics cache, dashboard generation, Metabase integration, admin wizard logic, or the POS BI export. The only engine-adjacent edits are the two scoped route guards (`bi-requests.js` list, `bi-notifications.js`) and the `optionalAuth` mounts in `server.js` — all required for JWT identity to reach BI routes.
