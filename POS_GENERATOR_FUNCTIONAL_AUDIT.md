# CarthaPOS Generator — Personalization System Functional Audit

**Date:** 2026-07-15
**Scope:** Complete functional audit of the Personalization / POS Generator system only.
**Method:** Read-only code inspection. No code modified.

---

## Executive Summary

The CarthaPOS Generator is a **license-driven Electron POS application generator**. Given a license (client, modules, theme, business config), it produces a fully customized Windows desktop application. The system has two independent codebases:

1. **Web UI** (admin/frontend) — Multi-step wizard for configuring and generating POS
2. **Template** (pos-template/) — The base application that gets copied and customized
3. **Generator** (backend/utils/generators/) — Node.js scripts that transform the template into a branded POS

The personalization system is **architecturally well-designed** with clean separation of concerns, but **many features are only partially implemented** — configured in the web UI but not injected into the generated POS, or injected but not consumed at runtime.

Overall Personalization Score: **52/100**

---

## 1. Branding Audit

| Feature | Status | Evidence |
|---------|--------|----------|
| **Business name** | ✅ Works | Generator `customizeConfig()` sets `appConfig.theme.businessName`. Written to `resources/config.json` + `public/app-config.json` + `package.json` productName. |
| **Logo** | ⚠️ Partially | Web UI has logo upload (2MB max, base64 data URL). `app-config.json` has `theme.logo: null` always. Logo upload result stored only in `configuration` object sent to API, but never written to the generated `app-config.json`. **Logo is always null in generated POS.** |
| **Splash screen** | ❌ Missing | No splash screen mechanism exists. Electron app shows white screen then loading spinner. |
| **Login screen branding** | ❌ Missing | Generated POS uses `<POSWithAuth>` component. The generated auth/login screen shows a generic blue gradient background with no configurable business name, logo, or welcome message. |
| **Sidebar logo** | ❌ Missing | `POSNavbar.jsx` template has `{config.businessName || 'POS'}` as text. **No sidebar logo image support.** |
| **Window title** | ⚠️ Broken | Generator `customizeConfig()` in `build-pos.js` (old CLI) replaces `<title>` in `index.html`. **BUT** the new modular generator's `AssetManager` copies the template without updating `<title>`. Generated POS always shows "POS System" in browser/taskbar. |
| **App icon (EXE)** | ❌ Missing | `electron-builder` config has no `icon` field. Template has no icon files. Generated `.exe` uses default Electron icon. |
| **Favicon** | ❌ Stub | `index.html` references `/favicon.ico`. Template `public/` has no `favicon.ico` file. Generated POS has no favicon. |
| **Generated executable name** | ✅ Works | `package.json` → `build.win.artifactName: "carthapos-{name}-Setup-{version}.exe"`. Correctly customized. |
| **Company information** | ⚠️ Partial | `resources/config.json` has `businessName`, `clientId`. But no `author`, `company`, `copyright`, `legalName` in package.json or installer metadata. NSIS installer has no publisher/version info. |
| **Receipt branding** | ⚠️ Partial | Business name appears on receipts. Logo configured in Receipt Designer but does NOT print (thermal printer implementation does not support image rendering). |

**Files involved:**
- `pos-template/index.html` — `<title>` is static "POS System"
- `backend/utils/generators/AssetManager.js` — copies template, writes `resources/config.json`
- `backend/utils/generators/ThemeCustomizer.js` — writes `app-config.json`
- `pos-template/public/` — no favicon.ico, no app icon
- `pos-template/src/components/layout/POSNavbar.jsx` — text-only business name
- `pos-template/src/components/POSWithAuth.jsx` — generic login screen
- `pos-template/src/lib/hardware/thermalPrinter.js` — no image printing support

---

## 2. Theme System Audit

| Feature | Status | Evidence |
|---------|--------|----------|
| **Primary color** | ✅ Works | Configurable in web UI. `app-config.json` writes `theme.colors.primary`. `POSConfiguration` applies `--color-primary` CSS var at runtime. Tailwind safelist includes `bg-primary`, `text-primary`, etc. |
| **Secondary color** | ⚠️ Partial | `app-config.json` writes `theme.colors.secondary` (sometimes missing). `POSConfiguration` maps to `--color-secondary`. Not all components use it — many hardcoded Tailwind colors remain in components. |
| **Accent color** | ⚠️ Partial | Written to config, mapped to `--color-accent`. Used sparingly. Buttons/modals mostly use primary, not accent. |
| **Background color** | ✅ Works | `--color-background` applied via CSS vars. Tailwind `bg-background` maps to it. |
| **Text color** | ✅ Works | `--color-text` applied. |
| **Dark mode** | ⚠️ Partial | Theme context with light/dark toggle exists in web UI. `applyTheme()` adds `dark-theme` CSS class to body. `complete.css` has `.dark-theme` overrides. **BUT** the generated POS does not expose a theme toggle UI, and the dark mode class is never toggled at runtime. |
| **Light mode** | ✅ Works | Default mode. |
| **Theme persistence** | ⚠️ Partial | Theme applied at build time via `ThemeCustomizer.js` CSS injection, AND at runtime via `App.jsx useEffect`. **Double application** — race condition if values differ. |
| **Generated theme** | ✅ Works | CSS variables written to both `index.css` (build-time) and `document.documentElement.style` (runtime). Tailwind config updated with custom colors. |
| **CSS generation** | ✅ Works | `generateCustomCSS()` in `ThemeCustomizer.js` produces valid CSS custom properties. |
| **Tailwind integration** | ✅ Works | `tailwind.config.js` maps CSS vars to semantic color names. Safelist ensures dynamic classes survive tree-shaking. |
| **Runtime switching** | ❌ Missing | No live theme switcher in generated POS. Theme is baked at generation time. User cannot change colors after installation without regeneration. |

**Theme values penetration analysis (what reaches the generated POS vs what's configured in the web UI):**

| Web UI Field | `app-config.json` (generated) | `index.css` (generated) | `document.style` (runtime) |
|---|---|---|---|
| primaryColor | ✅ `theme.colors.primary` | ✅ `--color-primary` | ✅ `--color-primary` |
| secondaryColor | ⚠️ Sometimes missing | ⚠️ Not always injected | ✅ (defaults used) |
| accentColor | ✅ | ✅ | ✅ |
| backgroundColor | ✅ | ✅ | ✅ |
| cardBackgroundColor | ❌ Not in app-config | ❌ | ✅ (POSConfiguration default) |
| textColor | ✅ | ✅ | ✅ |
| textMutedColor | ❌ Not in app-config | ❌ | ✅ (POSConfiguration default) |
| cardBorderColor | ❌ Not in app-config | ❌ | ✅ (POSConfiguration default) |
| fontFamily | ✅ | ❌ Not injected | ✅ |
| fontSize | ❌ Not in app-config | ❌ | ✅ (POSConfiguration default) |
| fontWeight | ❌ Not in app-config | ❌ | ✅ (default) |
| borderRadius | ❌ Not in app-config | ❌ | ✅ (POSConfiguration default) |
| shadowIntensity | ❌ Not in app-config | ❌ | ✅ (default) |

**Conclusion:** ThemeCustomizer.js only writes a SUBSET of colors to `app-config.json` and generated CSS. Many properties rely on `POSConfiguration` defaults in the template, which are never updated by the generator.

---

## 3. Layout Customization Audit

| Feature | Configurable? | Works in Generated POS? |
|---------|--------------|------------------------|
| **Sidebar position** (left/top/right) | ✅ Web UI | ✅ Component respects `navbarPosition` config |
| **Sidebar collapsible** | ✅ Web UI | ⚠️ Hidden behind hamburger but `sidebarCollapsible` config not consumed by generated POS nav component |
| **Topbar** | ❌ No option | Layout has no top bar — sidebar IS the primary navigation |
| **Dashboard layout** | ⚠️ Preview only | No config-driven dashboard layout. Dashboard uses static card arrangement |
| **Cards** (radius/padding/shadow) | ✅ Web UI (Composants tab) | ⚠️ `POSConfiguration.getCardClasses()` generates correct classes, but many card usages use hardcoded Tailwind classes (`rounded-lg`, `shadow-sm`) instead of config-based classes |
| **Tables** styling | ❌ No option | Tables use hardcoded Tailwind utility classes |
| **Buttons** (style/size/hover) | ✅ Web UI | ⚠️ `getButtonClasses()` generates correct classes, but many buttons use hardcoded classes |
| **Icons** customization | ❌ No option | Uses lucide-react exclusively. No icon pack selection or icon size config |
| **Navigation** items | ✅ Module-driven | ✅ Enabled modules appear/disappear in nav |
| **Page spacing** | ✅ Web UI | ⚠️ `spacingScale` written to CSS var but not consumed by page components (they use hardcoded spacing) |
| **Fonts** | ✅ Web UI | ✅ Font family applied via `--font-family` CSS var |
| **Corner radius** | ✅ Web UI | ⚠️ `borderRadius` mapped to Tailwind classes but many components use hardcoded `rounded-lg`, `rounded-md` |
| **Shadows** | ✅ Web UI | ⚠️ `shadowIntensity` mapped to `--shadow-intensity` but components use hardcoded shadow classes |
| **Animations** | ✅ Web UI | ⚠️ Animation CSS classes exist but many transitions are hardcoded in framer-motion `animate` props |

**Overall layout penetration:** ~30% of configurable layout options actually affect the generated POS UI. Most components use hardcoded Tailwind classes that ignore the personalization config.

---

## 4. Module Personalization Audit

| Module | Can Disable? | Nav Hidden? | Routes Removed? | Backend Disabled? |
|--------|-------------|-------------|-----------------|-------------------|
| Sales (pos-core) | ❌ Required | — | — | — |
| Dashboard | ✅ | ✅ | ✅ | N/A (frontend only) |
| Products | ✅ | ✅ | ✅ | N/A (frontend only) |
| Inventory | ✅ | ✅ | ✅ | ✅ (API routes not served) |
| Reports | ❌ Required | — | — | ✅ |
| Customers | ✅ | ✅ | ✅ | ✅ |
| Suppliers | ✅ | ✅ | ✅ | ✅ |
| Tables | ✅ | ✅ | ✅ | N/A |
| Kitchen | ✅ | ✅ | ✅ | N/A |
| Appointments | ✅ | ✅ | ✅ | N/A |
| Services | ✅ | ✅ | ✅ | N/A |
| Cash Register | ✅ | ✅ | ✅ | N/A |
| Receipt Designer | ✅ | ✅ | ✅ | N/A |
| Settings | ❌ Required | — | — | N/A |
| Barcode | ✅ | ✅ | ✅ | N/A |
| Quick Service | ✅ | ✅ | ✅ | N/A |
| Menu Management | ✅ | ✅ | ✅ | N/A |
| Takeaway | ✅ | ✅ | ✅ | N/A |
| Loyalty | ✅ | ✅ | ✅ | N/A |
| Payment Advanced | ✅ | ✅ | ✅ | N/A |
| Gift Cards | ✅ | ✅ | ✅ | N/A |
| Prescription | ✅ | ✅ | ✅ | N/A |
| Production | ✅ | ✅ | ✅ | N/A |

**Mechanism:** `ModuleFilter.js` comments out navbar menu items and route imports/components in `App.jsx`, `routes/index.js`, `POSComponentRegistry.jsx`. It does NOT delete files (to prevent `ReferenceError`).

**Issues:**
- Module names in license vs module names in `app-config.json` vs component import names use **different naming conventions** (`kitchen-printer` vs `kitchen` vs `Kitchen`). Risk of mismatch.
- `pos-core` is required but not explicitly enforced in UI (relies on backend validation).
- Some disabled module routes may still load if the import comment-out regex doesn't match.

---

## 5. Business Configuration Audit

| Setting | UI Input | Written to Config? | Consumed at Runtime? |
|---------|---------|-------------------|---------------------|
| Business Name | ✅ Step 1+Customizer | ✅ `app-config.json` + `resources/config.json` | ✅ `POSConfiguration`, `index.html` (broken) |
| Address | ✅ Customizer > Advanced | ❌ Not in `app-config.json` | ❌ Not consumed |
| Phone | ✅ Customizer > Advanced | ❌ Not in `app-config.json` | ❌ Not consumed |
| Email | ✅ Customizer > Advanced | ❌ Not in `app-config.json` | ❌ Not consumed |
| Tax Number | ✅ Receipt Designer | ⚠️ In `receiptConfig` (separate localStorage) | ⚠️ Only in receipt print |
| Currency | ✅ Customizer > Advanced | ✅ `theme.currency` | ✅ Price formatting |
| VAT/Tax Rate | ✅ Customizer > Advanced | ✅ `theme.taxRate` | ⚠️ Tax display in sales (uses DB settings, not generated config) |
| Business Type / Sector | ✅ Step 1 | ✅ Module selection based on sector | ⚠️ Sector not persisted in generated config |
| Language | ✅ Customizer > Advanced | ✅ `theme.language` | ❌ No i18n in generated POS |
| Timezone | ✅ Customizer > Advanced | ✅ `theme.timezone` | ❌ Not consumed |
| Date Format | ❌ No option | ❌ | ❌ Uses `toLocaleDateString('fr-FR')` hardcoded |
| Receipt Info | ✅ Receipt Designer | ⚠️ `receiptConfig` (localStorage/DB, not app-config) | ✅ Receipt Designer reads from DB |

**Key gap:** Business address, phone, and email are configurable in the web UI but **never written to `app-config.json`**. The generated POS cannot display them.

---

## 6. Receipt Customization Audit

| Feature | UI Option | Functional? |
|---------|-----------|-------------|
| Header text | ✅ 4 fields (name, address, phone, tax ID) | ✅ In receipt designer preview. `thermalPrinter.js` supports text but not image. |
| Footer text | ✅ 3 fields (message, return policy, custom) | ✅ |
| Logo | ✅ Upload in designer | ❌ `thermalPrinter.js` does not render images. Logo sent as undefined/null. |
| QR Code | ✅ Toggle (QR/barcode type) | ❌ No QR code generation library. Preview shows fake QR pattern. Print sends nothing. |
| Paper Width | ✅ 58mm/80mm | ✅ |
| Tax display | ✅ Toggle | ✅ |
| Discount display | ✅ Toggle | ✅ |
| Fonts | ❌ No option | Thermal printer uses monospace (ESC/POS standard) |
| Alignment | ❌ No option | Hardcoded left/right columns |
| Custom Message | ✅ Free text | ✅ |
| Receipt Preview | ✅ Live preview in designer | ✅ |

**Critical gap:** QR codes and logo images are displayed in the preview but NOT sent to the thermal printer. The `thermalPrinter.js` implementation only supports text.

---

## 7. Dashboard Personalization Audit

| Feature | Status |
|---------|--------|
| **Widgets** | ❌ No configurable widgets. Dashboard has 4 hardcoded stat cards (Sales, Products, Orders, Revenue) |
| **Cards** | ❌ Cannot add/remove/reorder cards |
| **Charts** | ❌ Bar chart is hardcoded (daily sales). No chart type/config selection. |
| **Quick Actions** | ❌ No configurable quick action buttons |
| **Shortcuts** | ❌ No shortcut system |
| **KPIs** | ⚠️ Fixed KPIs (today's sales, low stock, etc.). Cannot customize which KPIs display. |
| **Layout** | ❌ No layout options for dashboard |
| **Visibility** | ❌ Cannot hide specific dashboard sections |

**Dashboard is entirely hardcoded** with no personalization support beyond theme colors affecting card backgrounds.

---

## 8. Login Personalization Audit

The generated POS uses `<POSWithAuth>` component.

| Feature | Status |
|---------|--------|
| **Logo** | ❌ No logo on login screen. Gradient background only. |
| **Background** | ❌ Fixed gradient (`from-primary/5 via-background to-accent/5`). Not configurable. |
| **Company Name** | ❌ Not displayed on login screen. |
| **Welcome Message** | ❌ Not present. Generic POS interface. |
| **Theme** | ⚠️ Theme colors applied via CSS vars (background, text color) |
| **Remember Me** | ❌ No "remember me" on desktop login |
| **Brand Colors** | ⚠️ CSS vars apply, but gradient is fixed |

**Login screen is fully generic** with no business branding whatsoever. Not configurable.

---

## 9. Generated POS Audit

**What is copied from the template:**
- All source code files (skipping `node_modules/`, `.git/`, `dist/`)
- All UI components, hooks, pages, contexts, utils

**What values are injected:**
- `app-config.json` (public/ + dist/): License, modules (enabled/disabled), theme colors (primary/accent/background/text), currency, tax rate, language, timezone, security settings, printer settings
- `resources/config.json`: Business name, client ID, license key, portable mode flag
- `package.json`: `name`, `productName`, `description`, `build.appId`, `build.productName`, `build.win.artifactName`, `build.nsis.shortcutName`
- `index.html` title: ⚠️ **BROKEN** — modular generator does not replace `<title>`. Old CLI generator (`build-pos.js`) does.
- Tailwind config: Updated colors
- `index.css`: Prepended CSS custom properties
- Component files (Header, Sidebar, Buttons): Regex class replacement (partial)

**What remains defaults:**
- All business contact info (address, phone, email) — not written to config
- All component-level Tailwind classes (most cards/tables/buttons are NOT replaced)
- Hardcoded button styles, card styles — only ~3 component files are patched
- Favicon, app icon — not generated
- Login screen — fully generic
- Dashboard — fully hardcoded

**What is ignored by the generator:**
- `fontFamily`, `fontSize`, `fontWeight` — written to `app-config.json` but `POSConfiguration` may overwrite with defaults
- `borderRadius`, `shadowIntensity` — same issue
- Layout preferences (compact mode, spacing scale) — not consumed by components
- Animation preferences — hardcoded framer-motion props

**What is hardcoded in the template:**
- Login screen (`POSWithAuth.jsx`)
- Dashboard layout (`Dashboard.jsx`)
- Loading screens
- Error boundaries
- First-time setup wizard
- License check screen

---

## 10. Configuration Persistence Audit

| Storage | What's stored | Loaded at |
|---------|--------------|-----------|
| **`public/app-config.json`** | License, modules, theme, DB config, security, printer, features | Runtime via `useAppConfig` hook → `window.electronAPI.getAppConfig()` → reads file from disk |
| **`resources/config.json`** | Business name, client ID, license key, portable mode | Electron main process (preload) |
| **`package.json`** | App name, version, build config | Build time |
| **`src/index.css`** | Generated CSS custom properties | Imported at build time |
| **`tailwind.config.js`** | Custom colors, fonts | Built into CSS at build time |
| **Database (SQLite DB)** | Settings, receipt config, license check results | Runtime via IPC |

**Double-write issue:** `ThemeCustomizer.js` writes CSS vars to `index.css` (build time) AND `App.jsx` applies the same vars at runtime via `POSConfiguration.getStyleVars()`. If the two sources disagree, the runtime value (which runs later) wins — but this creates a flash of unstyled content.

**Survival across regeneration:** `app-config.json` is fully regenerated. Database is rebuilt if filename changes. Settings in DB survive if DB filename stays the same and data directory is preserved.

---

## 11. UI/UX Opportunities

### High Impact (Phase 1)
1. **Real business information injection** — Address, phone, email are configured in the web UI but never make it to the generated POS. Fix requires ~10 lines in `ThemeCustomizer.js`.
2. **Window title** — `<title>` in `index.html` is always "POS System". AssetManager must replace it with business name.
3. **Logo injection** — `theme.logo` is always `null` in generated config despite being uploadable in the web UI.
4. **Favicon + app icon generation** — Generate a simple colored favicon/icon from the primary color, or use the uploaded logo.

### Medium Impact (Phase 2)
5. **Component-level theme penetration** — Most components use hardcoded Tailwind classes. `ThemeCustomizer.js` only patches 3 components. Need a systematic approach (regex post-processor on all `.jsx` files, or CSS-driven theming via `@apply`).
6. **Receipt logo printing** — `thermalPrinter.js` needs image rendering support (ESC/POS GS L command).
7. **QR code printing** — Add `qrcode` library to template and wire into receipt designer.
8. **Dashboard personalization** — Make dashboard cards, charts, and KPIs driven by config rather than hardcoded.

### Low Impact (Phase 3)
9. **Login screen branding** — Show business name/logo on the `<POSWithAuth>` login screen.
10. **Font family across all text** — Many text elements use system fonts instead of `--font-family`.
11. **Animations toggle** — Respect `animations: false` config in framer-motion components.
12. **Splash screen** — Show business logo + name during app startup before React loads.
13. **NSIS installer branding** — Add publisher name, version info, and optional custom installer icon.
14. **Dark mode toggle in generated POS** — Add a simple theme toggle in the settings/header.
15. **Spacing scale applied globally** — Wire `spacingScale` CSS var into page layouts.

### Future (Phase 4)
16. **Module-level backend code exclusion** — Instead of commenting out, physically exclude backend files for disabled modules.
17. **Generated CSS variables for all components** — Replace all hardcoded Tailwind classes with CSS var references.
18. **Preview accuracy** — Make the web UI preview match the generated POS exactly (currently uses different rendering).
19. **Theme presets inheritance** — Allow "child" themes that inherit from a base but override specific properties.
20. **Custom component styling** — Allow per-component overrides (e.g., "make the sales button larger").

---

## Overall Personalization Score: **52/100**

### Scoring Breakdown

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Branding | 15% | 25% | 3.75 |
| Theme System | 20% | 60% | 12.0 |
| Layout Customization | 15% | 30% | 4.5 |
| Module Personalization | 15% | 85% | 12.75 |
| Business Configuration | 10% | 50% | 5.0 |
| Receipt Customization | 10% | 55% | 5.5 |
| Dashboard Personalization | 5% | 5% | 0.25 |
| Login Personalization | 5% | 10% | 0.5 |
| Generated POS Fidelity | 5% | 35% | 1.75 |
| **Total** | 100% | — | **52.0%** |

---

## Top 20 Improvements (Ranked)

| # | Improvement | Category | Impact | Effort | Phase |
|---|-------------|----------|--------|--------|-------|
| 1 | Fix window title in generated POS | Branding | High | 5 min | 1 |
| 2 | Inject business address/phone/email into `app-config.json` | Business Config | High | 10 min | 1 |
| 3 | Write uploaded logo to `app-config.json` (not null) | Branding | High | 15 min | 1 |
| 4 | Generate favicon + app icon from primary color | Branding | High | 30 min | 1 |
| 5 | Create systematic class replacement for ALL components | Theme | High | 2-3 hours | 2 |
| 6 | Add Favicon and app icon files to public/ | Branding | High | 10 min | 1 |
| 7 | Add receipt logo printing to thermalPrinter.js | Receipt | Medium | 4 hours | 2 |
| 8 | Add QR code generation library + printing | Receipt | Medium | 2 hours | 2 |
| 9 | Show business name on login screen | Branding | Medium | 30 min | 2 |
| 10 | Write `fontFamily`/`fontSize`/`borderRadius` to app-config properly | Theme | Medium | 15 min | 1 |
| 11 | Wire `spacingScale` CSS var into page layouts | Layout | Medium | 1 hour | 2 |
| 12 | Make dashboard cards/KPIs driven by config | Dashboard | Medium | 4 hours | 2 |
| 13 | Add dark mode toggle to generated POS settings | Theme | Medium | 1 hour | 2 |
| 14 | NSIS installer metadata (publisher, version, icon) | Branding | Low | 30 min | 3 |
| 15 | Splash screen with business logo + name | Branding | Low | 2 hours | 3 |
| 16 | Animation toggle respected in framer-motion components | Theme | Low | 1 hour | 3 |
| 17 | Remove double-write CSS variable race condition | Theme | Medium | 1 hour | 2 |
| 18 | Module-level backend file exclusion for disabled modules | Modules | Low | 2 hours | 4 |
| 19 | Real-time preview parity with generated POS | Preview | Low | 6 hours | 4 |
| 20 | Custom CSS/JS injection from advanced settings | Advanced | Low | 1 hour | 4 |

---

## Recommended Upgrade Roadmap

### Phase 1 — Critical Fixes (Before First Production POS)
*Estimated effort: 1-2 days*

1. Fix window title in generated POS (AssetManager → replace `<title>`)
2. Write business address, phone, email into `app-config.json`
3. Fix logo upload — persist to `theme.logo` instead of null
4. Generate favicon.ico (simple colored square from primary color)
5. Add default app icon to template (`public/icon.png` + electron-builder `icon` config)
6. Write `fontFamily`, `fontSize`, `borderRadius`, `shadowIntensity` into `app-config.json` theme block
7. Fix secondaryColor and cardBackgroundColor not being written to generated config

### Phase 2 — UI Improvement (Before Production POS v1.1)
*Estimated effort: 3-5 days*

1. Systematic component class replacement — post-process all `.jsx` files to replace hardcoded Tailwind with CSS-var-driven classes
2. Business name on generated POS login screen
3. Receipt logo printing support in `thermalPrinter.js`
4. QR code generation + printing in receipts
5. Dark mode toggle in generated POS settings panel
6. Wire `spacingScale` into all page-level layouts
7. Animation toggle respected in framer-motion usage
8. Fix double-write CSS variable race condition (write only at build-time OR only at runtime, not both)

### Phase 3 — Advanced Customization (v1.2)
*Estimated effort: 5-8 days*

1. NSIS installer publisher/version info and custom icon
2. Splash screen with business logo
3. Dashboard config-driven cards and KPIs
4. Login screen branding (background image, color scheme from config)
5. Receipt custom fonts and alignment options
6. Component-override theming (per-component style overrides)

### Phase 4 — Future Enhancements (v2.0)
*Estimated effort: 8-12 days*

1. Module-level backend code exclusion (don't deploy unused server routes)
2. Real-time preview parity (use same rendering engine in preview as generated POS)
3. Custom CSS/JS injection through advanced settings
4. Per-user theme preferences (server-side)
5. Theme marketplace
6. AI-powered theme generation from business description

---

## Audit Methodology

Each feature was evaluated by:
1. Checking the **web UI** for the configuration option
2. Checking the **generator code** (ThemeCustomizer, AssetManager, FilePatcher) for injection into the generated POS
3. Checking the **template code** (App.jsx, POSConfiguration, components) for runtime consumption
4. Verifying a **real generated POS** (`backend/generated-pos/`) to confirm values are actually present in output files

Files inspected: ~65 files across `admin/`, `frontend/`, `backend/`, `pos-template/`, and `generated-pos/`.

**This report is read-only. No code was modified during the audit.**
