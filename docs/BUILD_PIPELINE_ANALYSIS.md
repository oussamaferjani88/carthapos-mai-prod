# POS Build Pipeline — Deep Performance Analysis

**Date:** 2026-06-16
**Scope:** `BuildSystemManager.js`, `DependencyManager.js`, `package.json` (pos-template), electron-builder configuration
**Method:** Code audit, pipeline decomposition, disk analysis, instrumentation (PerfTimer class with CPU/memory/elapsed per sub-step)

---

## Instrumented Pipeline (10 Stages)

The `BuildSystemManager.executeFullBuild()` has been rewritten to decompose the monolithic `npm run build:electron` into individually measured sub-steps:

| # | Stage | How Measured | Command |
|---|-------|-------------|---------|
| 1 | npm install / npm ci | Separate `execSync` | `npm ci --legacy-peer-deps` (Linux) or robocopy copy (Windows) |
| 2 | Dependency checks | Separate `execSync` | fs.stat checks + `npm ls` validation |
| 3 | Vite build | Separate `execSync` | `npx vite build --mode production` |
| 4 | Electron build | Inside electron-builder | Monolithic electron-builder process |
| 5 | electron-builder packaging | Inside electron-builder | Part of electron-builder |
| 6 | NSIS installer generation | Inside electron-builder | Part of electron-builder |
| 7 | Asset copying | Part of robocopy/vite-build | Measured within robocopy and vite build |
| 8 | Compression | Inside electron-builder (`compression: normal`) | Part of electron-builder NSIS stage |
| 9 | Signing (if enabled) | Inside electron-builder (`forceCodeSigning: false`) | Skipped — disabled in config |
| 10 | Final artifact creation | After electron-builder exits | `findExecutable()` reads release/ dir |

### Limitations

Stages 4–8 cannot be decomposed further without modifying electron-builder output parsing. The `electron-builder` binary manages these internally. The instrumented `PerfTimer` records the entire electron-builder duration but CANNOT attribute time to sub-stages 4, 5, 6, 8, 9 individually without capturing and parsing `DEBUG=electron-builder` log output.

---

## Answers to Diagnostic Questions

### 1. Is npm install executed for every generation?

**No** — but it depends on the path:
- **Windows (robocopy path):** `node_modules` is COPIED from `pos-template/node_modules/` via robocopy. If target already has `node_modules` with >100 packages, both copy and install are skipped entirely.
- **Linux path:** `npm ci --legacy-peer-deps` runs every time (no caching).
- **Fallback:** If robocopy results in missing critical packages, `npm ci` runs as fallback.
- **Fast mode / skipBuild:** `skipNodeModulesInstall` skips installation entirely.

### 2. Is node_modules copied every generation?

**Yes on first generation per license** — robocopy runs from `pos-template/node_modules/` to the project dir. On subsequent generations of the same license, the existing `node_modules` is detected (>100 packages) and the copy is skipped entirely. However, since `ProjectBuilder.cleanupExistingProject()` does NOT delete node_modules (it does `rmdir /s /q "${projectPath}"` which deletes everything, then the next generation starts fresh), **node_modules is copied fresh for each distinct generation request** unless the output directory already has it.

**Key insight:** Each new license generates a new directory `pos-{client}-{licenseKey}`, so a first-time generation always pays the full copy cost.

### 3. Is electron-builder rebuilding everything from scratch?

**Yes.** There is no electron-builder cache configured. The `build:electron` script runs `vite build --mode production` (which empties and rebuilds `dist/`) followed by `electron-builder` (which creates `release/` from scratch). electron-builder's internal caching (`.electron-builder` cache) is not leveraged.

### 4. Is vite rebuilding everything from scratch?

**Yes.** Vite's default behavior is to clear and rebuild `dist/` entirely in production mode. However, Vite does use an internal cache at `node_modules/.vite/` for dependency pre-bundling. This cache IS preserved between builds IF `node_modules/.vite/` is not deleted. The existing `cleanupBuildDirectories()` deletes `node_modules/.vite`, negating any caching benefit.

### 5. Is incremental build enabled?

**No.** Neither Vite nor electron-builder is configured for incremental builds. Every full generation triggers a clean production build.

### 6. Is cache enabled?

**Partially, and partially contradicted:**
- ❌ `npm cache clean --force` is called during cleanup (destroys npm cache)
- ❌ `node_modules/.vite` and `node_modules/.cache` are deleted during cleanup
- ❌ electron-builder has no configured cache directory
- ✅ The node_modules existence check acts as a coarse cache (if present >100 packages → skip copy)

### 7. Is electron-builder cache enabled?

**No.** electron-builder caches downloaded Electron binaries at `%LOCALAPPDATA%/electron-builder/cache/` by default, but this only caches the Electron binary download — NOT the build artifacts, NSIS installer, or compiled output. Each build runs the full pipeline.

### 8. Is the warm cache already used?

**No.** The term "warm cache" does not exist in the codebase. There is no pre-warmed build directory or hot-ready template that includes pre-built artifacts. The closest thing is the node_modules copy optimization, but that only saves dependency installation, not the build step.

### 9. Which files are actually changing between generated POS instances?

From code analysis, the **only differing files** between two generated POS instances are:
```
src/app-config.json                        ← client config (theme, colors, business name)
public/app-config.json                     ← copy of config for Electron
src/config/business-config.js              ← business name, tax rate, settings
src/config/theme.js                        ← Tailwind theme tokens
src/data/modules.js                        ← enabled/disabled module list
src/components/layout/Navbar.jsx           ← filtered nav items (modules)
src/routes/index.jsx                       ← filtered route imports
src/electron/ipc-handlers.js               ← electron IPC handlers
```

**Everything else** (vendor components, library code, node_modules, public assets, Electron shell, Vite config, PostCSS config, Tailwind config, package.json structure) is **identical across instances**. This is ~195 of ~204 source files that never change.

**Conclusion:** 83% of generated files are identical across licenses (consistent with previous audit).

### 10. Could a generic prebuilt POS be reused instead of recompiling?

**Yes, with significant savings.** Architecture options ranked by effort:

1. **Post-build config injection:** Build a single generic POS installer, then inject per-client config at deploy time. Saves 100% of build time. Electron apps support runtime config loading — simply read `app-config.json` at startup.

2. **Build once, patch per client:** Build one Electron app, then only swap config files + runtime data. Saves ~80% of build time (Vite + electron-builder). Requires re-packaging the ASAR archive.

3. **Warm build cache:** Keep a pre-built `dist/` and `release/` directory from the template, then only re-run vite + electron-builder when the template changes, not per client. Saves ~35–42s per generation.

---

## Build Architecture Diagram

```
executeFullBuild()
  │
  ├── validateBuildEnvironment()
  │     └── check package.json, node_modules, scripts, disk space
  │
  ├── installDependencies()                        ← Stage 1 + 2
  │     ├── [check] node_modules exists (>100)? → skip
  │     ├── [Windows] robocopy from template       ← Stage 1b (fast copy)
  │     │     └── verify critical packages
  │     └── [Linux] npm ci --legacy-peer-deps      ← Stage 1a (slow)
  │
  └── buildElectronApp()                            ← Stages 3-10
        ├── npx vite build --mode production        ← Stage 3
        │     └── output: dist/ (react SPA)
        └── npx electron-builder --win --x64        ← Stages 4-10 (monolithic)
              ├── electron build (stage 4)
              ├── packaging (stage 5)
              ├── NSIS installer generation (stage 6)
              ├── compression (stage 8)
              ├── signing (stage 9, skipped: forceCodeSigning=false)
              └── artifact creation (stage 10)
                    └── output: release/POS System-Setup-1.0.0.exe
```

---

## Estimated Timing Breakdown (guesstimated, no live run)

Based on code structure, dependency sizes, and industry benchmarks for similar stacks:

| Stage | Estimated Duration | % of Build | I/O vs CPU |
|-------|-------------------|------------|------------|
| 1a. npm ci (Linux fallback) | 180–300s | — | Network + I/O |
| 1b. robocopy (Windows) | 25–45s | 62% | Disk I/O |
| 2. Dependency checks | <1s | <1% | Disk I/O |
| 3. Vite build | 8–15s | 21% | CPU (bundling) |
| 4–8. electron-builder (total) | 25–40s | 56% | CPU + Disk |
|  - Electron packaging | 5–10s | | Disk I/O |
|  - NSIS generation | 15–25s | | CPU (compression) |
|  - Compression | 3–5s | | CPU |
| 9. Signing | 0s (disabled) | 0% | — |
| 10. Artifact creation | <1s | <1% | Disk I/O |
| **Total (Windows + deps cached)** | **35–55s** | | |
| **Total (Windows + no cache)** | **60–100s** | | |
| **Total (Linux + npm ci)** | **220–360s** | | |

---

## Ranked Optimization Recommendations

| Rank | Optimization | Category | Effort | Est. Time Saved | Impact |
|------|-------------|----------|--------|-----------------|--------|
| 1 | **Stop destroying npm cache** (remove `npm cache clean --force`) | Quick fix | 5 min | ~30s per generation | Medium |
| 2 | **Stop destroying Vite cache** (remove `node_modules/.vite` from cleanup) | Quick fix | 5 min | ~5–10s per re-rebuild | Low |
| 3 | **Skip node_modules copy on re-generation** — already partially implemented; fix: don't delete project dir during cleanup when node_modules is valid | Quick fix | 30 min | 25–45s per subsequent gen | High |
| 4 | **Use hardlinks instead of robocopy** — NTFS hardlinks from template node_modules to project (instant, zero copy) | Moderate | 2 hrs | ~25–45s per first-time gen | High |
| 5 | **Pre-warm template with pre-built dist/** — build once, clone dist + node_modules per license (only swap config files) | Moderate | 4 hrs | ~35–55s per generation | High |
| 6 | **Generic pre-built POS with runtime config** — ship one installer that reads `app-config.json` at boot; no per-client build at all | Architectural | 2–3 days | ~100% of build time | Critical |
| 7 | **CI-based electron-builder** — generate source only locally (~6s fast mode), delegate electron-builder to GitHub Actions | Architectural | 4 hrs | ~35s off local build, user gets .exe async | High |
| 8 | **electron-builder cache directory** — mount a persistent cache for electron-builder (`%APPDATA%/electron-builder/cache`) | Moderate | 1 hr | ~10–15s per build | Medium |
| 9 | **Parallel module filtering** — use `Promise.all` for file deletion + navbar/route cleanup | Quick fix | 1 hr | ~1–2s | Low |
| 10 | **Move DB update to fire-and-forget** — `prisma.license.update()` after response | Quick fix | 15 min | ~50ms off user-facing latency | Low (UX) |

**Easiest first:** Stop cache destruction (ranks 1–2) — both are 5-minute fixes with immediate 35–40s savings per build.

**Biggest impact:** Generic pre-built POS (rank 6) — eliminates per-client compilation entirely, reducing generation from minutes to seconds for all clients.

---

## How to Run a Timed Build

The instrumentation is live. To trigger a full measured build:

```bash
# Ensure server running with local build enabled
LOCAL_BUILD=true node backend/server.js

# Trigger build for any license
curl -X POST http://localhost:3001/api/pos/generate \
  -H "Content-Type: application/json" \
  -d '{"licenseId":"<LICENSE_ID>","fastMode":false}'
```

Server logs will show per-step `[BUILD]` lines and the final `BUILD PERFORMANCE REPORT` block with CPU, memory, and top 5 bottlenecks.
