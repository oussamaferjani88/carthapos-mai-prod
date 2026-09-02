# Audit: POS Generation Blocking Other Requests

**Date:** 2026-08-26
**Trigger:** Locally, generating a POS in the admin panel caused an unrelated request (creating a client account from the public frontend) to hang until generation finished.
**Question asked:** Is this a localhost artifact, will it reproduce in production, and if so does it mean the backend "crashes" under concurrent load?

## Short answer

- **The exact behavior you saw is caused by `execSync` (synchronous subprocess calls) in the local POS-build code path.** Node.js runs your JS on a single thread; `execSync` freezes that thread — and therefore the *entire* server, every route, every user — for as long as the subprocess (vite, electron-builder, robocopy) runs.
- **As currently configured, this specific code path does not run in production.** `render.yaml` never sets `LOCAL_BUILD`, so the deployed backend takes the `skipBuild` branch: it writes source files (fast) and fires an async, non-blocking call to GitHub Actions instead. I verified `githubActionsService.js` uses `axios` throughout, not `execSync`.
- **It is not "just localhost" in the sense of being environment magic — it's this specific flag.** If `LOCAL_BUILD=true` ever gets set on the deployed service, the identical freeze will happen in production, affecting every concurrent user (admin and public site alike, since they share one backend service) — and it will likely be worse there (see risks below).
- **It would not "crash" the backend** (no exception, no process exit) — it would **hang/freeze**: the process stays alive but stops answering *any* request until the blocking call returns. From a user's perspective this is indistinguishable from an outage, and on a real deployment with a reverse-proxy/gateway timeout, concurrent requests can genuinely time out and fail (502/504) rather than just wait.

## Root cause, with evidence

`backend/utils/generators/PerfLogger.js:74-79` — every heavy build step is run through:

```js
measureSync(name, command, options = {}) {
  const { execSync } = require('child_process');
  const stdout = execSync(command, { ... });
```

`execSync` is **blocking**: Node's single JS thread does nothing else — no other HTTP request, no other route handler, nothing — until that child process exits. This is different from `spawn`/`exec` (async), which let Node's event loop keep serving other requests while the subprocess runs in the background.

Every call site that goes through `perfLogger.measureSync()` in `backend/utils/generators/BuildSystemManager.js` blocks the whole server for its full duration. Measured durations from this session's testing (`LOCAL_BUILD=true` path):

| Step | Typical duration | Runs when |
|---|---|---|
| robocopy (node_modules / shell sync) | 0.1 – 15s | every generation |
| `vite build` (shell build) | 15 – 45s | only on a shell-cache miss (rare — pos-template source changed) |
| `electron-builder --dir` (shell build) | ~3 min | only on a shell-cache miss |
| `electron-builder --prepackaged` (per-client repackage) | ~50s – 2 min | **every generation** |

So on the common case (cache hit), the server is frozen for roughly **1–1.5 minutes per generation**; on a cache miss, **4–6 minutes**. `ProjectBuilder.js:57-61` also uses `execSync` for cleanup on failure (short, but same category).

This also directly explains what you saw: while that `execSync` call is running, Express literally cannot pick up the "create account" request off the socket queue to start processing it — it's not that the request is slow, it's that nothing is being processed at all.

## Is this localhost-specific?

**No** — the mechanism (`execSync` blocks the single Node thread) is identical everywhere Node runs, local machine or cloud container. What differs is **whether this code path executes at all**:

- `backend/routes/pos.js:56-64`: `localBuild = process.env.LOCAL_BUILD === 'true'`. Only when true does the heavy `BuildSystemManager` path (and this session's new shell-cache feature) run at all.
- `backend/.env` (where you have `LOCAL_BUILD="true"` for local testing) is git-ignored — confirmed via `git check-ignore` — so it never reaches a deployment.
- `render.yaml`'s `carthapos-backend` service env vars do **not** include `LOCAL_BUILD` anywhere.
- Therefore, on Render as currently declared, `localBuild` is `false`, `skipBuild` is `true`, and generation takes the fast, source-only path + an async GitHub Actions dispatch — never touching `execSync`.

**Caveat — I can't fully rule this out without access to your Render dashboard:** Render allows environment variables to be set manually in the dashboard in addition to `render.yaml`. If `LOCAL_BUILD=true` (or `FAST_LOCAL_GENERATION`, which has the same category of effect) was ever added there — intentionally or by someone copying local `.env` values — the full blocking behavior would reproduce in production exactly as you saw it locally, and worse (next section). **Worth explicitly checking the Render dashboard's env vars for this service to confirm `LOCAL_BUILD` is absent.**

## Additional risks even in the "safe" (skipBuild) production path

1. **This session's entire shell-caching speedup only applies to the `LOCAL_BUILD=true` path.** `useShellCache` in `routes/pos.js` is gated on `localBuild && !skipBuild`. Production's actual generation speed is governed by the GitHub Actions workflow (`.github/workflows/build-pos.yml`), which I only partially touched (removed a redundant `npm ci`, added dependency caching in Step 6) — the shell-cache architecture itself was never applied there. If production generation still feels slow, that's a separate, unaddressed problem from what this session fixed.

2. **If `LOCAL_BUILD=true` were ever enabled in production, it would likely fail outright before even getting to "slow."** The Render backend runs on Linux (`runtime: docker`), and building a Windows NSIS installer normally needs either a Windows host or Wine — this is exactly what the codebase's own comments already flag ("Wine issues on Render"). Combined with `NODE_OPTIONS: --max-old-space-size=450` (a 450MB heap cap, consistent with a free/starter-tier instance), running `vite build` + `electron-builder` (both memory-hungry, especially asar packing and NSIS compression) as child processes alongside the API on a memory-constrained container risks OOM kills, not just slowness.

3. **A second, distinct concurrency bug in this session's own shell-cache code:** `BuildSystemManager._buildShell()` writes to one shared, unlocked directory (`pos-template/.shell-cache/_building`) with no mutex/lockfile. If two generation requests both hit a cache miss at the same time (e.g., right after a `pos-template` deploy, two admins generate within the same window), they will race to write into that same workspace concurrently and can corrupt each other's build. This is separate from the event-loop-blocking issue and would only matter if `LOCAL_BUILD=true` is in play with multiple concurrent admin users.

4. **Other `execSync` usage exists outside the POS generator**, e.g. `backend/services/etl-pipeline.js` (BI/ETL subsystem). Same category of risk if that code is reachable synchronously from a request handler under load — not investigated in depth here since it's outside what you asked about, but worth being aware the pattern isn't unique to POS generation.

5. **Even the fast/production path does a handful of synchronous `fs` operations in the request handler** (template copy, small config/patch file writes — all measured under ~1s combined in this session's testing). Not a real concern at current scale, but worth knowing it's non-zero blocking, not zero.

6. **Single backend instance, no horizontal scaling.** `render.yaml` defines one `carthapos-backend` web service with no replica/scaling config, and both the public frontend and the admin panel point at the exact same service URL. There's no isolation between "customer-facing traffic" and "admin/internal traffic" at the infrastructure level — any resource contention on this one process/container affects everyone, regardless of the `execSync` issue specifically.

## How to prevent this (not implemented — for your review)

Roughly in order of effort vs. impact:

1. **Replace `execSync` with async `spawn`/`execFile` (promisified) in `PerfLogger.measureSync` and `ProjectBuilder`'s cleanup.** This is the direct fix for the blocking mechanism itself: the child process (vite/electron-builder/robocopy) still takes the same wall-clock time, but Node's event loop stays free to serve other requests while waiting. Highest impact for the effort — but only matters if `LOCAL_BUILD=true` is ever live in production, or for improving the local dev experience.
2. **Add a lockfile/mutex around `BuildSystemManager._buildShell()`'s shared workspace** so two concurrent cache-miss builds can't corrupt each other. Independent of #1, only matters when `LOCAL_BUILD=true` with concurrent admins.
3. **Move generation off the request-handling process entirely** — a real job queue (e.g., BullMQ + Redis, or even a simple worker process) that the API enqueues into and returns immediately from, with a status-polling endpoint (the codebase already has the shape of this for the GitHub Actions flow — `GET /api/pos/build-status/:licenseId`). This is the most robust fix and the one that scales best if `LOCAL_BUILD`-style local building is ever wanted in production, or if the GitHub-Actions round trip itself needs to move in-process someday.
4. **Cap concurrent heavy builds** (a semaphore of 1–2 at a time) regardless of #1–3, since running many `electron-builder` processes simultaneously on one machine will contend for real CPU/memory/disk even once the event-loop-blocking issue is fixed.
5. **Confirm and document that `LOCAL_BUILD` must never be set on the deployed backend** — add a startup guard/warning if `NODE_ENV=production && LOCAL_BUILD=true` is detected, so this can't silently regress.

## What I did **not** do

Per your request, no code was changed for this investigation — this is purely the audit.
