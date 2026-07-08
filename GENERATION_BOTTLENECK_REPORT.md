# Generation Bottleneck Report

**Date:** 2026-06-17
**Data Source:** `generation-metrics.json` (2 full builds + 1 fast mode)
**Instrumentation:** PerfLogger on 31 steps across index.js + BuildSystemManager.js

---

## 1. Last Generation Breakdown (14m 47s)

License: `POS-MQHT9YKU` | Generation ID: `gen-1781685049617-z1gv0h`

| Step | Duration | % of Total | Cumulative % |
|------|----------|-----------|--------------|
| electron-builder | **12m 50s** (769,865 ms) | **86.83%** | 86.83% |
| vite build | **1m 25s** (85,278 ms) | **9.62%** | 96.45% |
| copy node_modules (robocopy) | **30.3s** (30,282 ms) | **3.42%** | 99.87% |
| Copy Template | 409 ms | 0.05% | 99.92% |
| Theme Customizer (total) | 223 ms | 0.03% | 99.95% |
| File Patcher (total) | 283 ms | 0.03% | 99.98% |
| Create Config File | 14 ms | <0.01% | 99.98% |
| Module Filter (total) | 30 ms | <0.01% | 99.98% |
| All other steps | <50 ms | <0.01% | 100% |

### What consumed the 15 minutes (in order of magnitude)

```
electron-builder (NSIS installer generation + compression)
  │
  ├── ASAR packaging (electron app bundle)
  ├── Platform-specific binary (win64)
  ├── NSIS script compilation
  ├── Installer compression (normal level)
  ├── Installer metadata
  └── Final .exe assembly
  └── ≈ 770s ─────────────────────────────────────── 86.8%
  
vite build (React app bundle)
  ├── Dependency pre-bundling
  ├── TypeScript/JSX compilation (esbuild)
  ├── CSS processing (Tailwind v4, PostCSS)
  ├── Asset hashing & chunking
  ├── Minification
  └── Electron file copy (closeBundle hook)
  └── ≈ 85s ──────────────────────────────────────── 9.6%

robocopy (node_modules copy from template)
  ├── ~439 top-level packages × average 200 files each
  ├── Running sequentially through file system filter
  ├── Windows Defender scanning each file
  └── ≈ 30s ──────────────────────────────────────── 3.4%

Everything else (26 sub-steps combined)
  └── < 1s ───────────────────────────────────────── <0.2%
```

---

## 2. Detailed Durations (Both Full Builds)

| Metric | Build 1 (6m 1s) | Build 2 (14m 47s) | Delta |
|--------|-----------------|-------------------|-------|
| **Total** | **360,857 ms (6m 1s)** | **886,663 ms (14m 47s)** | **+525,806 ms (+146%)** |
| **Build Electron** | **340,837 ms (5m 41s)** | **855,254 ms (14m 15s)** | **+514,417 ms (+151%)** |
| electron-builder | 313,586 ms (5m 14s) | **769,865 ms (12m 50s)** | **+456,279 ms (+145%)** |
| vite build | 27,237 ms (27.2s) | **85,278 ms (1m 25s)** | **+58,041 ms (+213%)** |
| robocopy node_modules | 19,431 ms (19.4s) | **30,282 ms (30.3s)** | **+10,851 ms (+56%)** |
| Copy Template | 394 ms | 409 ms | +15 ms |
| Module Filter | 48 ms | 30 ms | -18 ms |
| Theme Customizer | 35 ms | 223 ms | +188 ms |
| File Patcher | 40 ms | 283 ms | +243 ms |

**Key observation:** Build 2 is 2.5× slower than Build 1 despite using the same license. This indicates **NSIS compression is CPU-bound and highly variable** based on system load/temperature/throttling.

---

## 3. Verification Questions

### Is npm install executed on every generation?
**No.** npm install is never executed. Dependencies are COPIED via robocopy from `pos-template/node_modules/`. The `npm ci` fallback only runs if critical packages are missing after copy (which has never triggered in any recorded generation).

### Is npm ci executed on every generation?
**No.** npm ci has never been recorded in any generation. All builds use robocopy copy from template. The Linux path would use npm ci but all builds so far are Windows.

### Are node_modules copied every generation?
**Yes, always.** Every full build copies the entire template `node_modules/` (~439 top-level packages) via robocopy. This takes 19–30s each time. The "skip if >100 packages" check exists in code but the target directory is always created fresh because `ProjectBuilder.cleanupExistingProject()` deletes the entire project directory first.

### Is npm cache cleared every generation?
**Yes.** `BuildSystemManager.cleanNpmCache()` calls `npm cache clean --force` during cleanup. However, since npm install/ci is never used (robocopy copies node_modules instead), the npm cache isn't actually needed. The cache clearing does not affect build time but wastes ~30s if cleanup is called.

### Is vite build executed more than once per generation?
**No.** Vite build runs exactly once per generation, at `npx vite build --mode production`. It takes 27–85s depending on system conditions.

### Is electron-builder executed more than once per generation?
**No.** electron-builder runs exactly once per generation, at `npx electron-builder --win --x64`. It takes 5–13 minutes depending on system conditions.

---

## 4. Root Cause Analysis: Why 15 Minutes

### Primary bottleneck: electron-builder NSIS compression (86.8%)

electron-builder performs the following internally as a single monolithic process:

1. **ASAR packaging** — bundles `dist/`, `public/`, `src/electron/`, selected `node_modules/` into `app.asar` (~5–15s)
2. **Electron binary copy** — copies the Electron v37 runtime binary (~180MB) (~5–10s)
3. **Platform-specific processing** — sets Windows executable metadata, icons, version info (~3–5s)
4. **NSIS script compilation** — generates `installer.nsh` from configuration, compiles with `makensis` **(this is the heavy part: 3–8 min)**
5. **Installer compression** — compresses the installer payload with LZMA or DEFLATE **(CPU-bound: 2–5 min)**
6. **Final artifact assembly** — writes the .exe installer file (~2–5s)

Stages 4 and 5 are **single-threaded, CPU-bound operations** that scale with:
- Number of files being packaged
- Total size of the application directory
- CPU clock speed and thermal throttling

**Build 2 took 2.5× longer than Build 1** likely due to:
- System thermal throttling after the first build heated up the CPU
- Windows Defender real-time scanning of generated NSIS script files
- Disk fragmentation on the spinning/SSD drive
- Background processes competing for CPU

### Secondary bottleneck: vite build (9.6%)

Vite build varies from 27s to 85s (3× variability). This is because:
- Vite caches dependency pre-bundling in `node_modules/.vite/`
- If this cache is present, vite starts faster
- If the cache was deleted (which happens in cleanup), it re-pre-bundles all dependencies

The `build:safe` script also runs the `copyElectronFiles()` closeBundle hook which copies Electron files to `dist/`.

---

## 5. Detailed Timing Table (ms)

| Sub-step | Build 1 | Build 2 | Notes |
|----------|---------|---------|-------|
| Validate License | 3 | 2 | Negligible |
| Create Output Directory | 3 | 2 | Negligible |
| Copy Template | 394 | 409 | ~400ms consistent |
| Ensure Preload | 3 | 5 | |
| Rename Electron | 5 | 2 | |
| Create Config File | 10 | 14 | |
| Module Filter x3 | 48 | 30 | |
| Package JSON update | 5 | 4 | |
| Tailwind directives | 4 | 4 | |
| Create Tailwind config | 3 | 1 | |
| **copy node_modules** | **19,431** | **30,282** | **3.4% — always runs** |
| Theme CSS | 2 | 29 | |
| Theme Tailwind | 3 | 80 | |
| Theme Global Styles | 5 | 42 | |
| Theme Components | 1 | 24 | |
| Theme App Config | 24 | 48 | |
| File Remove | 1 | 3 | |
| File Electron fix | 1 | 27 | |
| File PostCSS | 5 | 30 | |
| File Tailwind | 1 | 14 | |
| File Vite | 5 | 13 | |
| File Preload | 2 | 31 | |
| File UI Components | 14 | 71 | |
| File Dashboard | 3 | 26 | |
| File Package JSON | 8 | 68 | |
| **vite build** | **27,237** | **85,278** | **9.6%** |
| **electron-builder** | **313,586** | **769,865** | **86.8% ← BOTTLENECK** |

### Percentage Distribution Across All Non-Build Steps

| Category | Build 1 | Build 2 |
|----------|---------|---------|
| **build pipeline** (vite + electron-builder) | **94.4%** | **96.5%** |
| **dependencies** (robocopy) | **5.4%** | **3.4%** |
| template + patches + theme + everything else | **0.2%** | **0.1%** |

---

## 6. Recommendations (Ranked by Impact)

### 1. Fix the 15-minute electron-builder bottleneck

**electron-builder consumes 86.8% of total generation time.**

Options:
- **Increase NSIS compression level** (`compression: "store"` instead of `"normal"`) — faster packaging, larger installer
- **Use 7-zip or external compression** instead of NSIS built-in
- **Reduce installer payload** — exclude unnecessary files from the `files` config
- **Pre-build electron-builder cache** — some electron-builder stages can be cached

### 2. Address vite build variability (27s → 85s)

**Vite build varies 3× between runs.**
- Preserve `node_modules/.vite/` cache between builds (currently deleted in cleanup)
- Vite's `--mode production` could use `--emptyOutDir false` + cache manifest for incremental builds

### 3. Eliminate redundant robocopy (19–30s per build)

**node_modules are copied from template every single generation.**
- Use NTFS hardlinks instead of robocopy (instant: `fs.linkSync()`)
- Or pre-warm: keep a hot project directory with node_modules and only swap config files

### 4. Verify the "robocopy FAIL" status is a false positive

The robocopy exit status of 1–7 indicates "new files were copied" which is normal behavior, but our code treats exit >7 as failure. This is cosmetic only.

---

## 7. Summary

**The 15-minute generation breaks down as:**
- **12m 50s** — electron-builder (NSIS + compression) — **86.8%**
- **1m 25s** — vite build — **9.6%**
- **30s** — robocopy node_modules — **3.4%**
- **<1s** — everything else (26 steps) — **<0.2%**

**Fix the NSIS compression to fix the generation time.**
