# CarthaPOS Generator - Architecture Report

> Complete architecture discovery document. Generated from source code analysis.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Folder Architecture](#2-folder-architecture)
3. [Generator Pipeline](#3-generator-pipeline)
4. [Personalization System](#4-personalization-system)
5. [Generator Classes](#5-generator-classes)
6. [app-config.json Flow](#6-app-configjson-flow)
7. [Runtime Architecture](#7-runtime-architecture)
8. [Module System](#8-module-system)
9. [Build Pipeline](#9-build-pipeline)
10. [Important Configuration Files](#10-important-configuration-files)
11. [Personalization-Related Files](#11-personalization-related-files)
12. [Dependency Map](#12-dependency-map)

---

## 1. Project Overview

CarthaPOS Generator is a platform that generates **fully customized Windows POS (Point of Sale) desktop applications** for restaurant, cafe, and retail clients. Each client gets a standalone Electron application built from a shared template, personalized with their branding, modules, and business configuration.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN WEB PORTAL                             │
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────────┐  │
│  │   frontend/   │───▶│  backend/    │───▶│    PostgreSQL DB     │  │
│  │  (React/Vite) │    │(Node/Express)│    │ (Prisma ORM)        │  │
│  │  Port: 5173   │    │  Port: 3001  │    │                      │  │
│  └──────────────┘    └──────┬───────┘    └──────────────────────┘  │
│                              │                                       │
│                    ┌─────────▼─────────┐                            │
│                    │  Generator Engine  │                            │
│                    │  (utils/generators/)│                           │
│                    └─────────┬─────────┘                            │
└──────────────────────────────┼──────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   pos-template/     │
                    │   (Electron + React  │
                    │    + SQLite)         │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │   generated-pos/    │
                    │   (Per-client POS)  │
                    │   - Custom branding  │
                    │   - Custom modules   │
                    │   - Custom config    │
                    │   → Built to .exe    │
                    └─────────────────────┘
```

---

## 2. Folder Architecture

### Root Level (`D:\Carthapos\`)

| Folder | Purpose |
|--------|---------|
| `frontend/` | Customer-facing React portal (Vite + TypeScript + Tailwind). Users register, configure POS settings, generate builds. |
| `admin/` | Admin management panel (Vite + JavaScript). Used internally to manage clients, licenses, and trigger generation. |
| `backend/` | Node.js/Express API server. Contains the generation engine, database management, and all business logic. |
| `pos-template/` | The base Electron + React + SQLite POS application. This is the **source template** that gets copied and customized per client. |
| `generated-pos/` | Output directory for generated POS applications (currently empty via `.gitkeep`). |
| `scripts/` | Build scripts, license generators, and test utilities. |
| `dev-data/` | Development database (`pos-data.db`) and backups. |
| `docs/` | Extensive documentation (99+ files covering various implementation details). |
| `examples/` | Example configuration files (`restaurant-config.json`, `cafe-config.json`). |
| `tests/` | Unit tests and test setup. |
| `metabase/` | Business Intelligence integration with Metabase. |
| `.github/` | GitHub Actions workflows for CI/CD. |

### Backend Structure (`backend/`)

| Path | Purpose |
|------|---------|
| `server.js` | Main Express server entry point (port 3001). Registers all routes, middleware, and auto-seeds data. |
| `src/` | Clean architecture: `config/`, `controllers/`, `middleware/`, `repositories/`, `routes/`, `services/`, `validators/`. |
| `utils/` | **The core generator engine** — `generators/`, `config/`, `theme/`, `common/`. |
| `routes/` | Legacy flat route files (26 routes for BI, modules, clients, licenses, POS, etc.). |
| `services/` | Legacy flat service files (BI, ETL pipeline, warehouse). |
| `prisma/` | Prisma schema, migrations, and seed file. PostgreSQL database. |
| `uploads/` | File upload storage. |

### POS Template Structure (`pos-template/`)

| Path | Purpose |
|------|---------|
| `public/electron-modular.cjs` | **Electron main process** — creates window, initializes managers, registers all IPC handlers. |
| `public/preload.cjs` | **Preload script** — exposes `window.electronAPI` to renderer with 90+ IPC channels. |
| `src/electron/` | Electron-side managers: `ElectronDatabaseManager.cjs`, `ElectronAuthManager.cjs`, `ElectronLicenseManager.cjs`, `ElectronWindowManager.cjs`. |
| `src/electron/handlers/` | 12 IPC handler files (auth, database, license, app, sales, customers, suppliers, kitchen, service, BI export, cash register, stock). |
| `src/components/` | React UI components: Layout, Navbar, Header, Content, SetupWizard, etc. |
| `src/pages/` | 28 page components (Dashboard, Sales, Products, Tables, Kitchen, etc.). |
| `src/hooks/` | React hooks: `useAppConfig.js`, `useLicense.js`, `useThemeApplier.js`, `useSettings.js`. |
| `src/contexts/` | React contexts: `AuthContext.jsx`, `UserContext.jsx`. |
| `src/config/` | `AppConfig.js` (runtime config class), `theme.js` (theme initialization), `app-config.json` (default config). |
| `src/lib/` | Utility libraries: `POSConfiguration.js` (central config), `POSComponentRegistry.jsx`, hardware/keyboard/system managers. |
| `src/styles/` | CSS files: `complete.css` (Tailwind directives + custom styles). |

---

## 3. Generator Pipeline

### End-to-End Flow

```
License (from PostgreSQL via Prisma)
  │
  ▼
┌─────────────────────────────────────────────────────┐
│ Step 1: VALIDATE LICENSE                            │
│ File: utils/config/license-validator.js             │
│ - Check required fields (id, licenseKey, isActive) │
│ - Process configuration with defaults              │
│ - Normalize modules array                          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 2: INITIALIZE PROJECT                          │
│ Class: ProjectBuilder                               │
│ - Generate project name: pos-{client}-{licenseKey} │
│ - Create output dir in generated-pos/              │
│ - Cleanup existing project if it exists             │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 3: COPY TEMPLATE & ASSETS                      │
│ Class: AssetManager                                 │
│ - Copy entire pos-template/ to project dir         │
│ - Skip: node_modules, .git, dist, build            │
│ - Ensure preload file exists                       │
│ - Rename electron files (main.js → electron-main.js)│
│ - Create resources/config.json                     │
│ - Create public/app-config.json (first version)    │
│ - Update index.html title with business name       │
│ - Generate branded favicon SVG                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 4: FILTER MODULES                              │
│ Class: ModuleFilter                                 │
│ - Map module codes to page files (e.g. inventory   │
│   → Inventory.jsx)                                 │
│ - NOTE: Currently SKIPS file deletion for safety   │
│ - Comments out navbar items for disabled modules    │
│ - Cleans up route imports in App.jsx               │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 5: INSTALL DEPENDENCIES                        │
│ Class: DependencyManager                            │
│ - Update package.json (name, version, main entry)  │
│ - Configure Electron build settings                │
│ - Ensure Tailwind directives exist                 │
│ - Install node_modules (robocopy on Windows,       │
│   npm ci on Linux)                                 │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 6: THEME CUSTOMIZATION                         │
│ Class: ThemeCustomizer                              │
│ - Ensure CSS files exist (index.css, complete.css) │
│ - Update Tailwind config with theme colors          │
│ - Generate custom CSS variables in index.css       │
│ - Update component styles (header, sidebar, button)│
│ - Generate app-config.json (full version)          │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 7: FILE PATCHES                                │
│ Class: FilePatcher                                  │
│ - Remove unnecessary files (pnpm-lock, .env)       │
│ - Fix electron file names (.cjs → .js)             │
│ - Ensure PostCSS config for Tailwind v4            │
│ - Verify Tailwind config                           │
│ - Rewrite vite.config.js (ESM format)              │
│ - Ensure preload.cjs is copied                     │
│ - Ensure all UI components exist                   │
│ - Patch Dashboard.jsx (bg-white → bg-card)         │
│ - Patch package.json (productName, appId, EXE name)│
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Step 8: BUILD APPLICATION                           │
│ Class: BuildSystemManager                           │
│ - Validate build environment                       │
│ - Install/verify dependencies                      │
│ - Run: npx vite build --mode production            │
│ - Run: npx electron-builder --win --x64 [--dir]    │
│ - Find generated executable in dist/               │
│ - Optional: GitHub Actions trigger                 │
└─────────────────────────────────────────────────────┘
                       │
                       ▼
Generated POS ready for download or deployment
```

---

## 4. Personalization System

### 4.1 Theme

Theme configuration flows through multiple layers:

**Configuration Source:** `LicenseConfiguration` table in PostgreSQL stores all theme values:
- `primaryColor`, `secondaryColor`, `accentColor`, `backgroundColor`, `textColor`, `textMutedColor`, `cardBackgroundColor`
- `fontFamily`, `fontSize`, `fontWeight`
- `borderRadius`, `shadowIntensity`, `shadows`, `animations`
- `glassEffect`, `gradientBackgrounds`, `compactMode`, `highContrastMode`
- `navbarPosition`, `navbarStyle`, `navbarCollapsible`, `navbarWidth`, `navbarHeight`

**Generation-time Application:**
1. `ThemeCustomizer.updateTailwindConfig()` → writes `tailwind.config.js` with CSS variable mappings
2. `ThemeCustomizer.updateGlobalStyles()` → injects CSS variables into `index.css` via `:root` block
3. `ThemeCustomizer.updateComponentStyles()` → regex-replaces hardcoded classes in Header.jsx, Sidebar.jsx, Button.jsx
4. `ThemeCustomizer.updateAppConfig()` → writes full theme config to `app-config.json`

**Runtime Application:**
1. `App.jsx` loads config via `useAppConfig()` hook
2. `POSConfiguration.createConfig(config.theme)` normalizes all theme values
3. `POSConfiguration.getStyleVars(themeConfig)` generates CSS custom properties
4. `useThemeApplier(mergedConfig)` in `Layout.jsx` sets `document.documentElement.style.setProperty()` for each variable
5. Tailwind config maps CSS variables to utility classes (e.g., `bg-primary` → `var(--color-primary)`)

### 4.2 Branding

- **Business Name:** Set in `LicenseConfiguration.businessName`, propagated to:
  - `index.html` `<title>` tag
  - `app-config.json` → `theme.businessName`
  - `POSNavbar` display
  - `Layout.jsx` footer
  - Window title in Electron
  - NSIS installer shortcut name
  - Package.json `name` field (determines AppData folder)
  - Database filename (sanitized business name + `.db`)

- **Logo:** Stored as base64 or path in `LicenseConfiguration.logo`, copied to `public/` as `business-logo.{ext}`

- **Favicon:** Auto-generated SVG with business initials and primary color by `AssetManager.generateBrandedFavicon()`

### 4.3 Modules

Modules are controlled at two levels:

**Database Level:**
- `Module` table: defines available modules (name, displayName, description, category, isCore)
- `LicenseModule` junction table: links licenses to modules with `isEnabled` flag

**Generation-time Level:**
- `ModuleFilter` receives the license's enabled modules list
- **Currently:** Files are NOT deleted (safety measure). Instead:
  - `filterNavbarModules()` comments out navbar items for disabled modules
  - `cleanupRoutes()` comments out route definitions and imports in `App.jsx` and `POSComponentRegistry.jsx`

**Runtime Level:**
- `app-config.json` contains the normalized modules array
- `useAppConfig()` loads the config
- `POSNavbar` filters navigation items based on `config.modules` where `isEnabled !== false`
- Route definitions in `App.jsx` still exist but disabled modules' imports are commented out

### 4.4 Business Configuration

Stored in `LicenseConfiguration` table and propagated to `app-config.json`:
- `currency`, `taxRate`, `language`, `timezone`, `dateFormat`, `timeFormat`
- Business info: `businessAddress`, `businessPhone`, `businessEmail`, `businessWebsite`, `businessTaxId`
- Feature toggles: `enableTableManagement`, `enableCustomerDisplay`, `enableBarcode`, `enableInventoryTracking`, `enableCash`, `enableCard`, `enableMobile`, `enableGiftCards`

### 4.5 Receipt Configuration

Stored in `app-config.json` under `receipt` key:
- `header`, `footer`, `autoPrint`, `paperWidth`
- `showLogo`, `showBusinessInfo`, `showQR`, `qrContent`, `copies`

Also configurable at runtime via `ReceiptDesigner` page which stores settings via IPC → database.

### 4.6 Assets

- **Template files** are copied from `pos-template/` to `generated-pos/{project}/`
- **Business logo** is copied to `public/business-logo.{ext}`
- **Favicon** is auto-generated as SVG
- **electron-builder** icons: configurable via `nsis-installer.nsh`

### 4.7 Configuration Files

| File | Purpose | Generated By |
|------|---------|-------------|
| `public/app-config.json` | Main runtime config consumed by React | `ThemeCustomizer.updateAppConfig()` + `AssetManager.createConfigFile()` |
| `dist/app-config.json` | Copy for production build | Written by same functions to both locations |
| `resources/config.json` | Minimal config for Electron main process | `AssetManager.createConfigFile()` |
| `tailwind.config.js` | Tailwind CSS theme with CSS variable mappings | `TailwindConfigManager` |
| `postcss.config.js` | PostCSS with Tailwind v4 plugin | `FilePatcher.ensurePostCSSConfig()` |
| `vite.config.js` | ESM Vite config with Electron file copying | `FilePatcher.fixViteConfig()` |
| `package.json` | NPM config with Electron builder settings | `PackageConfigManager.updatePackageJson()` + `FilePatcher.patchPackageJSON()` |
| `index.css` | Custom CSS variables injected before Tailwind | `ThemeCustomizer.updateGlobalStyles()` |

---

## 5. Generator Classes

### `ProjectBuilder` (`utils/generators/ProjectBuilder.js`)

- **Input:** License object, optional outputPath
- **Responsibility:** Creates the output directory, generates project name, manages cleanup
- **Project Name Pattern:** `pos-{clientName}-{licenseKey}`
- **Output:** `{ projectPath, projectName, baseOutputPath }`
- **Delegates to:** `BuildSystemManager`, `FilePatcher`

### `AssetManager` (`utils/generators/AssetManager.js`)

- **Input:** projectPath
- **Responsibility:** Template copying, asset management, file generation
- **Key Methods:**
  - `copyTemplate()` — Copies pos-template/ excluding node_modules, .git, dist
  - `ensurePreloadFile()` — Creates fallback preload script if missing
  - `renameElectronFiles()` — Renames main.js to electron-main.js
  - `createConfigFile(license)` — Creates `resources/config.json` AND `public/app-config.json`
  - `updateAssetReferences(businessName, primaryColor, logoPath)` — Updates HTML title, generates favicon
  - `generateBrandedFavicon(color, name, outputDir)` — Creates SVG favicon with initials
- **Output:** Customized project directory with assets

### `ModuleFilter` (`utils/generators/ModuleFilter.js`)

- **Input:** projectPath, enabledModules array
- **Responsibility:** Disables modules by commenting out code (NOT deleting files)
- **Key Methods:**
  - `filterModules(enabledModules)` — Currently a no-op (skips file deletion for safety)
  - `filterNavbarModules(enabledModules)` — Comments out disabled module items in POSNavbar.jsx
  - `cleanupRoutes(enabledModules)` — Comments out disabled module imports and routes in App.jsx
- **Module-File Mapping:** Maps 20 module codes to their corresponding `.jsx` page files
- **Core Modules (never filtered):** Sales.jsx, Products.jsx, Dashboard.jsx, Settings.jsx, UserAdmin.jsx, Login.jsx, Inventory.jsx, Barcode.jsx, Customers.jsx, Reports.jsx

### `DependencyManager` (`utils/generators/DependencyManager.js`)

- **Input:** projectPath, license object
- **Responsibility:** Package management and dependency installation
- **Delegates to:**
  - `PackageConfigManager` for package.json updates
  - `TailwindConfigManager` for Tailwind configuration
  - `BuildSystemManager` for actual npm install
- **Key Methods:**
  - `updatePackageJson()` — Sets name, description, version, main entry
  - `installTailwindDependencies()` — Ensures Tailwind directives in CSS
  - `createConfigFiles()` — Creates Tailwind config

### `ThemeCustomizer` (`utils/generators/ThemeCustomizer.js`)

- **Input:** projectPath, license object
- **Responsibility:** Full theme application
- **Key Methods:**
  - `ensureCSSFiles()` — Verifies index.css, complete.css, custom.css exist
  - `updateTailwindConfig()` — Writes tailwind.config.js with theme colors
  - `updateGlobalStyles()` — Generates CSS variables block injected into index.css
  - `updateComponentStyles()` — Regex-replaces hardcoded colors in component files
  - `updateAppConfig()` — **Most important method** — generates the complete `app-config.json` with 100+ configuration properties
  - `generateCustomCSS(config)` — Returns CSS `:root` variables block

### `FilePatcher` (`utils/generators/FilePatcher.js`)

- **Input:** projectPath
- **Responsibility:** Post-copy file fixes and patches
- **Key Methods:**
  - `removeUnnecessaryFiles()` — Removes pnpm-lock, .env.example, README.dev.md
  - `fixElectronFiles()` — Renames .cjs to .js if needed
  - `ensurePostCSSConfig()` — Creates/updates postcss.config.js for Tailwind v4
  - `ensureTailwindConfig()` — Verifies tailwind.config.js exists
  - `fixViteConfig()` — Rewrites vite.config.js in ESM format
  - `ensurePreloadFile()` — Copies preload.cjs from template
  - `ensureUIComponents()` — Copies missing UI components from template
  - `patchDashboardComponent()` — Replaces bg-white with bg-card class
  - `patchPackageJSON(businessName)` — Updates name, productName, appId, artifactName, shortcutName

### `BuildSystemManager` (`utils/generators/BuildSystemManager.js`)

- **Input:** projectPath, options (releaseBuild flag)
- **Responsibility:** Full build pipeline (npm install → vite build → electron-builder)
- **Key Methods:**
  - `installDependencies()` — On Windows: robocopy node_modules from template (~20s). On Linux: npm ci.
  - `buildElectronApp()` — Runs `vite build` then `electron-builder --win --x64`
  - `findExecutable()` — Searches dist/, release/, out/ for .exe files
  - `cleanupBuildDirectories()` — Removes dist, release, temp-build, coverage
  - `validateBuildEnvironment()` — Checks package.json and node_modules exist
  - `executeFullBuild()` — Orchestrates: validate → install → build

### `PerfLogger` (`utils/generators/PerfLogger.js`)

- **Input:** N/A (singleton)
- **Responsibility:** Performance monitoring and reporting for generation pipeline
- **Key Methods:**
  - `initGeneration()` — Starts timing a generation run
  - `measure(name, fn)` — Times async operations
  - `measureSync(name, command)` — Times sync shell commands
  - `finishGeneration()` — Generates performance report, saves metrics
- **Output:** Console report, `generation-performance.log`, `generation-metrics.json`

---

## 6. app-config.json Flow

### Where Values Come From

```
PostgreSQL: license_configurations table
  ↓ (Prisma query with include: { client, modules: { include: { module } }, configuration })
  ↓
Backend: routes/pos.js or src/services/posService.js
  ↓
Generator: utils/pos-generator.js → generators/index.js
  ↓
AssetManager.createConfigFile(license)     → Creates FIRST version (license + security)
  ↓
ThemeCustomizer.updateAppConfig()          → Creates FINAL version (full config with all settings)
  ↓
Written to: public/app-config.json AND dist/app-config.json
```

### app-config.json Structure

```json
{
  "license": { id, key, client, bindingType, machineId, expirationDate, ... },
  "modules": [{ name, displayName, isEnabled, description }],
  "theme": {
    "businessName", "appTitle", "footerText", "welcomeText",
    "logo", "favicon",
    "colors": { primary, secondary, accent, background, text, textMuted, border, cardBackground },
    "currency", "taxRate", "language", "timezone",
    "primaryColor", "secondaryColor", ... (duplicated flat properties),
    "animations", "shadows", "borderRadius", "glassEffect",
    "navbarPosition", "navbarWidth", "navbarHeight",
    "components": { cards, buttons, grid, forms },
    // ... 60+ more properties
  },
  "businessInfo": { name, address, phone, email, website, taxId, logo },
  "receipt": { enabled, header, footer, autoPrint, paperWidth, showLogo, ... },
  "database": { type: "sqlite", filename: "{sanitized-business-name}.db" },
  "security": { requireUSBLicense, licenseFileName },
  "printer": { enabled, autoprint, paperWidth },
  "features": { barcode, multiplePaymentMethods, discounts, returns, ... }
}
```

### How It Is Consumed

**Electron Main Process** (`electron-modular.cjs`):
- `loadAppConfig()` reads from `dist/app-config.json` (production) or `public/app-config.json` (dev)
- Falls back to `resources/config.json` if primary not found
- Provides config via IPC channel `get-app-config`

**React Renderer** (`useAppConfig.js` hook):
- Calls `window.electronAPI.getAppConfig()` (Electron mode)
- Falls back to `fetch('app-config.json')` (web dev mode)
- Returns config object used throughout the app

**POSConfiguration.js** (`POSConfiguration.createConfig()`):
- Normalizes raw config into a clean object with all defaults applied
- Provides computed methods: `getStyleVars()`, `getCardClasses()`, `getButtonClasses()`, etc.

---

## 7. Runtime Architecture

### Electron Process Flow

```
electron-modular.cjs (Main Process)
  │
  ├── app.whenReady()
  │     ├── initializeManagers()
  │     │     ├── ElectronDatabaseManager (SQLite)
  │     │     ├── ElectronAuthManager (bcryptjs)
  │     │     ├── ElectronLicenseManager (USB detection)
  │     │     └── ElectronWindowManager (BrowserWindow)
  │     │
  │     ├── registerAllHandlers()
  │     │     ├── registerAuthHandlers (login, setup, password)
  │     │     ├── registerDatabaseHandlers (raw SQL queries)
  │     │     ├── registerLicenseHandlers (validate, USB)
  │     │     ├── registerAppHandlers (config, settings)
  │     │     ├── registerSalesHandlers (orders, sales)
  │     │     ├── registerCustomerHandlers
  │     │     ├── registerSupplierHandlers
  │     │     ├── registerKitchenHandlers
  │     │     ├── registerServiceHandlers
  │     │     ├── registerBiExportHandlers
  │     │     ├── registerCaisseHandlers (cash register)
  │     │     └── registerStockHandlers
  │     │
  │     └── createWindow()
  │           ├── Load preload.cjs (contextBridge)
  │           ├── Load dist/index.html or localhost:5173
  │           └── Open DevTools (dev only)
  │
  └── app.on('before-quit') → close database
```

### Preload Bridge

`preload.cjs` exposes `window.electronAPI` with ~90 IPC methods:

```
window.electronAPI
  ├── getAppConfig()          → get-app-config
  ├── validateLicense()       → validate-license
  ├── query(sql, params)      → database:query
  ├── authenticateUser(...)   → authenticate-user
  ├── getProducts()           → get-products
  ├── addSale(sale)           → add-sale
  ├── ... (90+ methods)
  └── onDatabaseUpdated(cb)   → event listener
```

### React Application Flow

```
main.jsx
  ├── ThemeWrapper (applies theme from config/theme.js before render)
  │     └── applyTheme() → sets CSS variables on document.documentElement
  └── App
        └── ErrorBoundary
              └── AuthProvider
                    └── AppContent
                          ├── useAppConfig() → loads app-config.json
                          ├── useLicense() → validates license
                          ├── useAuth() → checks user session
                          │
                          ├── [First Time] → SetupWizard
                          │     └── Creates admin user via IPC
                          │
                          ├── [No User] → POSWithAuth (login screen)
                          │
                          └── [Authenticated] → MainPOSApp
                                └── Router
                                      └── Layout
                                            ├── POSNavbar (filtered by modules + user role)
                                            ├── POSHeader (business name, clock)
                                            ├── POSContent → children
                                            │     └── <Routes> → 28 page components
                                            └── Footer (version, status)
```

### Database Layer (Generated POS)

```
ElectronDatabaseManager
  ├── Reads database filename from app-config.json
  │     e.g., "restaurant-le-gourmet.db"
  ├── Resolves database path:
  │     Production: {installDir}/data/{filename}
  │     Portable: {appDir}/data/{filename}
  │     Dev: {userData}/{filename}
  ├── Opens SQLite3 connection
  ├── Creates tables on first run (auto-migration)
  ├── Uses FileLockManager for concurrent access
  └── Uses DatabaseQueryOptimizer for performance
```

---

## 8. Module System

### Available Modules (from database and code)

| Module Code | Display Name | Page File | Category |
|-------------|-------------|-----------|----------|
| `pos-core` | Caisse de base | Core (Sales.jsx) | Core |
| `inventory` | Gestion des stocks | Inventory.jsx | Standard |
| `reports` | Rapports | Reports.jsx | Standard |
| `barcode` | Code-barres | Barcode.jsx | Standard |
| `customers` / `customer-management` | Clients | Customers.jsx | Standard |
| `kitchen` / `kitchen-printer` | Cuisine | Kitchen.jsx | Restaurant |
| `tables` / `table-management` | Tables | Tables.jsx | Restaurant |
| `menu-management` | Menu | MenuManagement.jsx | Restaurant |
| `takeaway` / `delivery` | Vente à emporter | Takeaway.jsx | Restaurant |
| `quick-service` | Service rapide | QuickService.jsx | Cafe |
| `loyalty` | Fidélité | Loyalty.jsx | Standard |
| `payment-advanced` | Paiements avancés | PaymentAdvanced.jsx | Standard |
| `gift-cards` | Cartes cadeaux | GiftCards.jsx | Standard |
| `appointments` | Rendez-vous | Appointments.jsx | Salon |
| `services` | Services | Services.jsx | Salon |
| `suppliers` | Fournisseurs | Suppliers.jsx | Standard |
| `prescription` | Ordonnances | Prescription.jsx | Pharmacy |
| `production` | Production | Production.jsx | Bakery |
| `user-management` | Utilisateurs | UserAdmin.jsx | Core |
| `hardware-settings` | Matériel | HardwareSettings.jsx | System |
| `receipt-designer` | Receipt Designer | ReceiptDesigner.jsx | System |

### Module Filtering Behavior

1. **At generation time:** `ModuleFilter` comments out code but does NOT delete files
2. **At runtime (Navbar):** `POSNavbar` filters navigation items based on `config.modules[].isEnabled`
3. **At runtime (Routes):** Commented-out imports prevent disabled module routes from loading
4. **Core modules are never filtered:** Sales, Products, Dashboard, Settings, UserAdmin, Login, Inventory, Barcode, Customers, Reports

### Business Sector Presets

| Sector | Default Modules |
|--------|----------------|
| Restaurant | pos-core, tables, kitchen, inventory, reports |
| Cafe/Bar | pos-core, quick-service, inventory, reports |
| Retail | pos-core, inventory, barcode, customer-management, reports |
| Bakery | pos-core, inventory, production, customer-management, reports |
| Pharmacy | pos-core, inventory, prescription, customer-management, reports |
| Beauty Salon | pos-core, appointments, services, customer-management, reports |

---

## 9. Build Pipeline

### Electron Builder Configuration

**package.json build section (template):**
```json
{
  "appId": "com.pos-system.app",        → Patched to: com.carthapos.{business}
  "productName": "POS System",           → Patched to: "CarthaPos {BusinessName}"
  "directories": { "output": "release" },
  "asar": true,
  "files": ["dist/**/*", "public/**/*", "src/electron/**/*", "node_modules/**/*", ...],
  "win": {
    "target": [{ "target": "nsis", "arch": ["x64"] }],
    "artifactName": "${productName}-Setup-${version}.${ext}",
    "requestedExecutionLevel": "requireAdministrator"
  },
  "nsis": {
    "oneClick": false,
    "perMachine": true,
    "allowToChangeInstallationDirectory": true,
    "shortcutName": "CarthaPos-default"  → Patched to: "CarthaPos-{business}"
  }
}
```

### Build Steps

1. **PackageConfigManager.updatePackageJson()** — Sets basic metadata, main entry, build files list
2. **FilePatcher.patchPackageJSON(businessName)** — Sets:
   - `name`: `carthapos-{sanitized-business}` (determines AppData folder)
   - `productName`: `CarthaPos {BusinessName}` (window title)
   - `appId`: `com.carthapos.{sanitized-business}` (prevents install conflicts)
   - `artifactName`: `carthapos-{business}-Setup-${version}.${ext}`
   - `nsis.shortcutName`: `CarthaPos-{business}`
3. **BuildSystemManager.installDependencies()** — Copies node_modules via robocopy (Windows) or npm ci (Linux)
4. **BuildSystemManager.buildElectronApp()**:
   - `npx vite build --mode production` → produces `dist/`
   - `npx electron-builder --win --x64 --dir` (dev) or `--win --x64 --publish=never` (release) → produces installer in `release/` or `dist/`
5. **BuildSystemManager.findExecutable()** — Searches dist/, release/, out/ for .exe files

### Build Modes

| Mode | Environment Variable | Behavior |
|------|---------------------|----------|
| Full local build | `LOCAL_BUILD=true` | Source generation + npm install + vite build + electron-builder |
| Source only | `LOCAL_BUILD=false` | Source generation only (no build) |
| Fast local | `FAST_LOCAL_GENERATION=true` | Source only, skip node_modules |
| Release | `releaseBuild: true` | Full installer (.exe NSIS) |
| Dev | `releaseBuild: false` | Unpacked directory only (`--dir`) |

### GitHub Actions Integration

When `LOCAL_BUILD=false` and GitHub Actions is configured:
1. Source is generated on the server
2. `GitHubActionsService.triggerBuild()` fires a workflow
3. Build status tracked in `License.buildStatus` and `License.buildRunId`
4. On download request, artifact is fetched from GitHub and extracted

---

## 10. Important Configuration Files

| File | Location | Purpose |
|------|----------|---------|
| `schema.prisma` | `backend/prisma/` | Database schema (PostgreSQL). 30+ models including License, LicenseConfiguration, Module, Client, BI models, analytics warehouse. |
| `package.json` | `pos-template/` | Template Electron app configuration. Contains electron-builder build settings. |
| `package.json` | `backend/` | Backend API dependencies and scripts. |
| `package.json` | `frontend/` | Frontend portal dependencies. |
| `vite.config.js` | `pos-template/` | Vite build config with Electron file copying plugin. |
| `tailwind.config.js` | `pos-template/` | Tailwind theme with CSS variable color mappings and safelist. |
| `postcss.config.js` | `pos-template/` | PostCSS config for Tailwind v4. |
| `app-config.json` | `pos-template/src/config/` | Default/fallback app configuration. |
| `electron-modular.cjs` | `pos-template/public/` | Electron main process entry point. |
| `preload.cjs` | `pos-template/public/` | Electron preload script exposing IPC bridge. |
| `nsis-installer.nsh` | `pos-template/` | NSIS installer customization script. |
| `.env` | `backend/` | Environment variables (DATABASE_URL, PORT, JWT secret, etc.). |
| `render.yaml` | Root | Render.com deployment configuration. |
| `Makefile` | Root | Build/deploy commands. |

---

## 11. Personalization-Related Files

### Generator-Side (Backend)

| File | Role in Personalization |
|------|------------------------|
| `backend/utils/pos-generator.js` | Entry point — delegates to modular generator |
| `backend/utils/generators/index.js` | Orchestrator — calls all generators in sequence |
| `backend/utils/generators/AssetManager.js` | Copies template, generates favicon, creates configs |
| `backend/utils/generators/ThemeCustomizer.js` | **Primary personalization engine** — CSS variables, Tailwind, app-config.json |
| `backend/utils/generators/ModuleFilter.js` | Enables/disables module navigation and routes |
| `backend/utils/generators/FilePatcher.js` | Patches Dashboard, package.json (names, EXE name) |
| `backend/utils/generators/DependencyManager.js` | Package.json metadata updates |
| `backend/utils/generators/ProjectBuilder.js` | Project directory creation |
| `backend/utils/generators/BuildSystemManager.js` | Build with custom product name |
| `backend/utils/config/TailwindConfigManager.js` | Tailwind CSS configuration |
| `backend/utils/config/PackageConfigManager.js` | Package.json configuration |
| `backend/utils/config/license-validator.js` | License and config validation |
| `backend/utils/common/logger.js` | Logging infrastructure |

### Template-Side (POS Runtime)

| File | Role in Personalization |
|------|------------------------|
| `pos-template/src/config/app-config.json` | Default configuration (overwritten during generation) |
| `pos-template/src/config/AppConfig.js` | Runtime config class with defaults |
| `pos-template/src/config/theme.js` | Theme initialization and CSS variable application |
| `pos-template/src/lib/POSConfiguration.js` | **Central personalization runtime** — normalizes config, generates CSS vars, computes component classes |
| `pos-template/src/hooks/useAppConfig.js` | Loads app-config.json at runtime |
| `pos-template/src/hooks/useLicense.js` | Validates license at runtime |
| `pos-template/src/hooks/useThemeApplier.js` | Applies theme CSS variables to DOM |
| `pos-template/src/components/ThemeWrapper.jsx` | Applies theme before render |
| `pos-template/src/components/Layout.jsx` | Merges theme config, applies to layout |
| `pos-template/src/components/POSNavbar.jsx` | Filters navigation by enabled modules |
| `pos-template/src/components/POSHeader.jsx` | Displays business name |
| `pos-template/src/App.jsx` | Global CSS variable application, route definitions |
| `pos-template/src/main.jsx` | ThemeWrapper initialization, console disabling in prod |
| `pos-template/public/preload.cjs` | IPC bridge for config access |

---

## 12. Dependency Map

### Backend Generator Dependencies

```
pos-generator.js
  └── generators/index.js (orchestrator)
        ├── config/license-validator.js
        ├── ProjectBuilder.js
        │     ├── BuildSystemManager.js
        │     └── FilePatcher.js
        ├── AssetManager.js
        ├── ModuleFilter.js
        ├── DependencyManager.js
        │     ├── config/PackageConfigManager.js
        │     ├── config/TailwindConfigManager.js
        │     └── BuildSystemManager.js
        ├── ThemeCustomizer.js
        │     └── config/TailwindConfigManager.js
        ├── FilePatcher.js
        ├── BuildSystemManager.js
        └── PerfLogger.js (singleton)
```

### POS Template Runtime Dependencies

```
main.jsx
  └── ThemeWrapper.jsx
        └── config/theme.js (applyTheme)
  └── App.jsx
        ├── hooks/useAppConfig.js → IPC → electron-modular.cjs → loadAppConfig()
        ├── hooks/useLicense.js → IPC → electron-modular.cjs → validate-license
        ├── contexts/AuthContext.jsx → IPC → electron-modular.cjs → authenticate-user
        ├── lib/POSConfiguration.js (runtime config normalization)
        ├── components/Layout.jsx
        │     ├── hooks/useThemeApplier.js (CSS variable injection)
        │     ├── components/POSNavbar.jsx (module filtering)
        │     ├── components/POSHeader.jsx
        │     └── components/POSContent.jsx
        └── pages/* (28 page components)

electron-modular.cjs (Main Process)
  ├── ElectronDatabaseManager.cjs → SQLite3
  ├── ElectronAuthManager.cjs → bcryptjs
  ├── ElectronLicenseManager.cjs → USB detection, license validation
  ├── ElectronWindowManager.cjs → BrowserWindow
  └── handlers/* (12 IPC handler modules)
        └── All use databaseManager for CRUD operations
```

### Data Flow Summary

```
PostgreSQL (Admin Portal)
  │ Prisma ORM
  ▼
Backend API (Express)
  │ REST endpoints
  ▼
Generator Engine (Node.js)
  │ File operations
  ▼
Generated POS Project (Filesystem)
  │ Vite build → Electron Builder
  ▼
Windows Installer (.exe)
  │ User installs
  ▼
Running POS App (Electron)
  │ SQLite database (per-client)
  │ app-config.json (per-client config)
  ▼
End User (Restaurant/Cafe/Retail staff)
```

---

*Report generated from source code analysis of CarthaPOS Generator project.*
*Last updated: July 2026*
