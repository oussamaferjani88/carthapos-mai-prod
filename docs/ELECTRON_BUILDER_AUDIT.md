# Electron-Builder Deep Audit

## Summary

`electron-builder` is responsible for **86.8%** of total generation time (~12m50s out of 14m47s). The bottleneck is **NSIS installer compression** of the packaged Electron app at the `compression: normal` level with `asar: false`.

## Configuration (from `pos-template/package.json`)

| Setting | Value | Impact |
|---------|-------|--------|
| `asar` | `false` | ⚠️ App is 30,000+ individual files (no single archive) |
| `compression` | `normal` | ⚠️ zlib compression, single-threaded in NSIS |
| `win.target` | `nsis` | Creates `.exe` installer via NSIS |
| `nsis.oneClick` | `false` | Assisted installer (more NSIS script complexity) |
| `nsis.perMachine` | `true` | Requires admin elevation |

## Payload Size Breakdown

### `win-unpacked` (comparable build with `asar: true`)

| Component | Size | % of Total |
|-----------|------|-----------|
| Electron runtime DLLs | ~80M | 39% |
| Chromium locales (55 langs) | 43M | 21% |
| `app.asar` (app + deps) | 83M | 40% |
| **Total** | **~206M** | |

### With `asar: false` (current config)

Node_modules on disk: **827M** (29,762 files)

## Schema Correction (2026-06-17)
- `electron-builder` 26.x **does not support** `"rebuild"` as a config property in the `"build"` section
- The correct property to disable native module rebuilding is **`"npmRebuild": false`**
- This was initially misconfigured as `"rebuild": false` which caused a schema validation error
- `npmRebuild: false` is safe because sqlite3 (the only native module) uses N-API (ABI-stable)
- `electron/` (runtime binary): 319M — ***not packaged in app, only DLLs go***
- `app-builder-bin/`: 207M — ***build-time tool, not packaged***
- Remaining deps: ~300M
- `dist/` (vite output): 1.5M
- App code + filtered deps: **~15M**

Total packaged size (est.): **~140M** app + **80M** Electron DLLs + **43M** locales = **~263M** unpacked

NSIS at `normal` compresses this to **120M** installer (45% compression ratio).

## Findings

### 1. `asar: false` is the Primary Cause

With `asar: true` (electron-builder default), the entire app is packed into a single `app.asar` file. NSIS then compresses one large file — fast and efficient.

With `asar: false`, **29,762 files** are copied individually to `win-unpacked/resources/app/`. NSIS must compress each file individually, which means:
- **Per-file overhead** in the NSIS script (header entry, directory entry for each file)
- **zlib compression context** reset per file (can't exploit cross-file redundancy)
- **I/O overhead** reading 30K+ small files from disk

**Estimated time contribution**: ~8-10 minutes of the 12m50s electron-builder time is attributable to `asar: false`.

### 1a. `asar: false` Appears to be an Oversight

The electron main process code (`public/electron-modular.cjs`) was written with `asar: true` in mind:
- Comments reference "inside app.asar" (lines 46, 65, 172)
- `asarUnpack` config already handles `src/electron/**/*` and `public/preload.cjs`
- The `main` entry point (`public/electron-modular.cjs`) is outside the asar

With `asar: true`:
- `dist/**/*` (renderer) → inside asar ✓
- `node_modules/sqlite3`, `crypto-js`, `bcryptjs` → inside asar ✓
- `src/electron/**/*` → unpacked from asar ✓
- `public/preload.cjs` → unpacked from asar ✓
- `public/electron-modular.cjs` → outside asar (entry point) ✓

**Verdict**: `asar: false` appears to have been set for debugging and left in. Reverting to `asar: true` should be safe and is the single highest-impact fix (~8-10 min saved). **Test with a build to verify.**

### 2. Chromium Locales (43M, 55 Languages)

Electron ships with Chromium i18n files for 55 languages. The POS only needs English (and possibly French as configured in NSIS). These 55 locale `.pak` files account for 21% of `win-unpacked` size and contribute to NSIS compression time.

### 3. NSIS Compression is Single-Threaded

NSIS uses `zlib` compression which runs on a **single CPU core**. On the build machine (unknown CPU), this means:
- Only 1 of N cores is utilized during the 12m50s
- Compression is CPU-bound, not I/O-bound

### 4. Compression Level: `normal`

The effective compression level is `normal` (zlib level 6). Changing to `store` (no compression) would reduce build time to near-zero for this step but increase installer size by ~2.2× (~264M → est. 400M+). Changing to `maximum` would make it even slower (est. 20-25 minutes).

### 5. Cache Underutilized

electron-builder cache is only **152M**. The NSIS compression output is not cached — every build recompresses from scratch. Only the Electron runtime download and NSIS resources are cached.

### 6. `node_modules` On-Disk vs Packaged

| Metric | Value |
|--------|-------|
| node_modules on disk | 827M (29,762 files) |
| node_modules actually packaged | ~15M (only sqlite3, crypto-js, bcryptjs) |
| Ratio | 55:1 |

The `files` pattern correctly excludes most of node_modules, but the **npm install** step (via robocopy) still copies all 827M. The robocopy time is only ~20-30s, though.

### 7. Per-File Patterns in `files` Config

The `files` array uses a whitelist approach:
```
dist/**/*
public/electron-modular.cjs
public/preload.js
public/app-config.json
src/electron/**/*
node_modules/sqlite3/**/*
node_modules/crypto-js/**/*
node_modules/bcryptjs/**/*
```

This is correct — only necessary files are packaged. But `asar: false` negates the benefit by forcing NSIS to handle 30K+ files anyway.

## Ranked Top 10 Actions by Time Reduction

| Rank | Action | Est. Time Saved | Complexity | Notes |
|------|--------|----------------|------------|-------|
| 1 | **Enable `asar: true`** | **~8-10 min** | Low | Is there a technical reason it's false? The modular architecture should work with asar if electron main is outside. Verify `asar: true` + `asarUnpack: ["src/electron/**/*", "public/preload.cjs"]`. |
| 2 | **Drop unneeded Chromium locales** | **~2-3 min** | Low | `electron-builder --win --x64 --extraMetadata.build.win.extraResources=...` or use `locale` filter in Electron config. Keep only `en-US.pak` and `fr.pak`. Saves 43M from payload → less to compress. |
| 3 | **Change NSIS compression to `store`** | **~10-12 min** | Low | `compression: store` in package.json. No compression at all. Installer size would be ~400M+ (huge). Only viable as temporary debug measure. |
| 4 | **Disable NSIS altogether during dev builds** | **~12 min** | Low | Use `--dir` flag: `electron-builder --win --x64 --dir`. Creates `win-unpacked/` directory instead of installer. Full build only for release. **This is the highest-ROI action for dev workflow.** |
| 5 | **Add NSIS compression cache** | **~1-2 min** | Medium | Pre-compress known-static files (Electron DLLs, locales) and cache them. NSIS supports `SetCompressorAuto` but electron-builder doesn't expose this. Custom NSIS template needed. |
| 6 | **Audit `node_modules` for unnecessary files** | **~0.5 min** | Low | Even with whitelist, npm installs all dependencies. Use `--production` flag or `NODE_ENV=production` during npm install. But robocopy only takes ~20-30s already. |
| 7 | **Parallelize electron-builder with task scheduling** | **~0 min** | High | electron-builder is inherently sequential. Can't parallelize. |
| 8 | **Use 7-Zip instead of NSIS** | **~1-2 min** | High | `electron-builder` supports `target: "7z"` but this produces a .7z archive, not an installer. Only useful for portable builds. |
| 9 | **Reduce file count in `dist/`** | **~0.1 min** | Low | Vite code-splitting creates many small chunks (70+ JS files). Configure Vite to produce fewer, larger chunks via `manualChunks`. Minor impact since total size is only 1.5M. |
| 10 | **Upgrade to electron-builder v25+ NSIS optimizer** | **~0.5 min** | Medium | Newer versions of NSIS include the `zlib-optimizer` which reduces header size. Already using v26.8.1. |

## Recommended Quick Wins

### 1. Dev builds: `--dir` flag (saves 12min)
```bash
electron-builder --win --x64 --dir
```
Creates `win-unpacked/` directory in seconds. The app can be run directly from there. Only generate the installer `.exe` for release builds.

### 2. Investigate why `asar: false` (saves 8-10min)
If there's no hard requirement for `asar: false`, switch to `asar: true`. The modular architecture should be compatible since the electron main process files can be excluded via `asarUnpack`.

### 3. Prune Chromium locales (saves 2-3min)
Add to package.json build config:
```json
"extraResources": [
  {
    "from": "node_modules/electron/dist/locales/en-US.pak",
    "to": "locales/en-US.pak",
    "filter": ["**/*"]
  }
]
```
And delete the `locales/` directory before packaging.

## Commands Used

All commands used during this audit are documented in `commands.txt`.
