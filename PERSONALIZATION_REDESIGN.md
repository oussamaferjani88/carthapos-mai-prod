# CarthaPOS Personalization Studio - Redesign Proposal

> A complete redesign of the personalization experience. Every option must produce a visible change in the real preview. No fake settings. No demo buttons. No dead controls.

---

## Table of Contents

1. [Current UX Review](#1-current-ux-review)
2. [Redesigned Personalization Workflow](#2-redesigned-personalization-workflow)
3. [Option Classification](#3-option-classification)
4. [New Personalization Features](#4-new-personalization-features)
5. [Preview Redesign](#5-preview-redesign)
6. [Settings Simplification](#6-settings-simplification)
7. [Features to Eliminate](#7-features-to-eliminate)
8. [Version Roadmap](#8-version-roadmap)
9. [Final Architecture](#9-final-architecture)

---

## 1. Current UX Review

### 1.1 Theme Selector

**What it does:** 6 preset themes (Moderne, Sombre, Chaleureux, Elegant, Nature, Minimal) as clickable cards. Each applies colors, font, border radius, and shadow.

| Aspect | Assessment |
|--------|-----------|
| Useful? | Yes -- presets are the fastest way to get started |
| Understandable? | Yes -- theme names and descriptions are clear |
| Fake options? | No -- all 6 themes produce visible changes |
| Professional? | Mostly. Needs larger preview swatches and a Custom option |

**Keep:** Everything. **Redesign:** Add 7th Personnalise card, larger color swatches, hover preview, overwrite confirmation.

### 1.2 Colors

**What it does:** 6 color pickers: primary, secondary, accent, background, card background, text.

| Aspect | Assessment |
|--------|-----------|
| Useful? | Yes |
| Fake options? | cardBackgroundColor partially consumed. Missing: textMutedColor, cardBorderColor |
| Duplicated? | animations toggle exists in 3 places |
| Professional? | No. Pickers too small. No swatches. No validation |

**Keep:** All 6. **Add:** textMutedColor, borderColor. **Redesign:** Live swatches, mini-preview, hex validation.

### 1.3 Typography

**What it does:** Font family (6 fonts), size slider (10-20px), weight dropdown.

| Aspect | Assessment |
|--------|-----------|
| Fake options? | Fonts work in POS but preview may not load Google Fonts |
| Professional? | No. Debug panel shown to users. No font preview in dropdown |

**Keep:** All 3. **Remove:** Debug panel. **Redesign:** Font preview, sample text, line-height.

### 1.4 Visual Effects

**What it does:** Shadow intensity, animation type/speed, card animation type/speed, toggles.

| Aspect | Assessment |
|--------|-----------|
| Fake options? | YES: gradientBackgrounds, glassEffect, cardAnimations, cardAnimationType, cardAnimationSpeed |
| Duplicated? | animations toggle duplicated in AdvancedSettings |

**Keep:** Shadow intensity, nav animation. **Remove:** 5 fake options. **Redesign:** Merge border radius, add animation preview.

### 1.5 Layout

**What it does:** 4 sub-tabs with 16 controls for navbar, components, grid, forms.

| Aspect | Assessment |
|--------|-----------|
| Fake options? | YES: spacingScale, maxWidth, compactMode, navbarCollapsible, sidebarCollapsible, hoverEffects, focusRing |

**Keep:** Navbar position. **Remove:** 7 fake options. **Redesign:** Flatten to Navigation + Components.

### 1.6 Advanced Settings

**What it does:** Business name, logo, currency, language, animations, autoSave, autoModeSwitch, customCSS.

| Aspect | Assessment |
|--------|-----------|
| Fake options? | YES: autoSave, autoModeSwitch, customCSS, language (no i18n) |

**Keep:** Business name, logo, app title, currency. **Remove:** 4 fake options. **Redesign:** Rename to Brand Identity.

### 1.7 Receipt Designer

**What it does:** 29 controls with excellent live preview. Save button is disabled.

**Keep:** Entire UI. **Remove:** Demo label. **Redesign:** Wire to backend in V2.

### 1.8 Hardware Settings

**What it does:** 28 controls. All simulated. No route. No backend.

**Remove from V1.** Rebuild in V3.

### 1.9 Preview Panel

**Matches generated POS?** NO -- 12 documented mismatches.

**Keep:** Concept. **Redesign:** Import actual pos-template components.

---

## 2. Redesigned Personalization Workflow

### Current Flow (Problematic)

```
Step 1: Basic Config
Step 2: Module Selection
Step 2.5: Template vs Custom (fork)
Step 2.7: Template Selection
Step 3: Advanced Customization (mixed panel)
Step 4: License Config
Step 5: Generate
```

Problems: Non-linear numbering. All personalization crammed into one panel. No clear progression.

### Proposed Flow (Linear, Progressive)

```
STEP 1: Choose Your Sector
  Restaurant | Cafe | Boutique | Pharmacie | Custom
  Pre-fills: modules, theme preset, receipt template, currency
         |
         v
STEP 2: Brand Identity
  Business name, logo upload, app title
  Currency, tax rate
  Preview: header bar + login screen with branding
         |
         v
STEP 3: Theme and Colors
  Start with sector preset (or choose different)
  7 theme cards: 6 presets + Personnalise
  If Personnalise: 8 color pickers with live swatches
  Preview: full POS with selected theme
         |
         v
STEP 4: Typography
  Font family with live preview
  Font size, weight, line-height
  Preview: sample text in selected font + POS content
         |
         v
STEP 5: Navigation and Layout
  Navbar position (left/top)
  Sidebar width
  Card style (border radius, shadow)
  Button style (rounded/square/pill)
         |
         v
STEP 6: Modules
  Toggle modules ON/OFF with descriptions
  Preview: navbar updates in real-time
         |
         v
STEP 7: Receipt Design
  4-tab receipt designer with live receipt preview
  Header, content, footer, advanced
  Business info auto-fills from Step 2
         |
         v
STEP 8: Final Preview and Generate
  Full-screen preview
  Device switching (desktop/tablet/mobile)
  Generate POS button
```

### Why This Order Is Better

1. **Sector first** -- immediately grounds the user in their context. Pre-fills everything.
2. **Brand before theme** -- business name/logo are the most personal elements. They should come first.
3. **Theme before details** -- user sees a complete POS quickly, then refines.
4. **Progressive disclosure** -- each step reveals only what is relevant. No overwhelming panels.
5. **Linear progression** -- clear steps 1-8. No 2.5 or 2.7 confusion.
6. **Receipt near the end** -- depends on brand info from Step 2. Must come after.
7. **Preview always visible** -- every step shows the POS preview updating in real-time.

### UX Rules

- Every step must show the preview panel on the right
- Changes appear instantly (no Apply button)
- A persistent header shows: Step name, Return to Step X, Save Draft
- User can click any step in the progress bar to jump back
- Generate only appears on Step 8 (not earlier)
- All settings auto-save to local state (debounced 500ms)

---

## 3. Option Classification

### Every Current Property

| Property | Verdict | Reason |
|----------|---------|--------|
| primaryColor | KEEP | Works end-to-end |
| secondaryColor | KEEP | Works end-to-end |
| accentColor | KEEP | Works end-to-end |
| backgroundColor | KEEP | Works end-to-end |
| textColor | KEEP | Works end-to-end |
| textMutedColor | KEEP | Works (Layout footer, POSNavbar) |
| cardBackgroundColor | KEEP | Partially works -- needs runtime fix |
| cardBorderColor | KEEP | Works in Layout -- add UI control |
| borderColor | RENAME | Merge with cardBorderColor |
| fontFamily | KEEP | Works with Google Font loading |
| fontSize | KEEP | Works |
| fontWeight | KEEP | Works |
| navbarPosition | KEEP | Works (left/top) |
| navbarWidth | KEEP | Partially works -- needs overlay width fix |
| navbarHeight | MERGE | Only used in top mode |
| navbarStyle | REMOVE | Not consumed by POSNavbar |
| navbarCollapsible | REMOVE | Not consumed |
| sidebarCollapsible | REMOVE | POSNavbar always collapsible |
| animations | KEEP | Works -- single toggle |
| animationType | KEEP | Works for nav items |
| animationSpeed | KEEP | Works for nav items |
| shadows | KEEP | Works |
| shadowIntensity | KEEP | Works via useThemeApplier |
| borderRadius | KEEP | Works via useThemeApplier |
| gradientBackgrounds | REMOVE | No runtime consumer |
| glassEffect | REMOVE | No runtime consumer |
| cardAnimations | REMOVE | No runtime consumer |
| cardAnimationType | REMOVE | No runtime consumer |
| cardAnimationSpeed | REMOVE | No runtime consumer |
| compactMode | REMOVE | Not consumed by Layout |
| spacingScale | REMOVE | CSS var set but never referenced |
| maxWidth | REMOVE | CSS var set but POSContent ignores it |
| showBreadcrumbs | REMOVE | No breadcrumb component exists |
| businessName | KEEP | Works end-to-end |
| appTitle | KEEP | Works (sets document.title) |
| logo | KEEP | Works (with path fix) |
| favicon | REMOVE | Always auto-generated |
| footerText | KEEP | Works in Layout footer -- add UI |
| welcomeText | REMOVE | Not consumed |
| currency | KEEP | Works in Sales.jsx |
| currencyPosition | KEEP | Works in formatPrice |
| taxRate | KEEP | Wire to Sales.jsx (currently hardcoded) |
| language | POSTPONE | No i18n -- V2 |
| timezone | REMOVE | Not consumed |
| dateFormat | POSTPONE | V2 |
| timeFormat | POSTPONE | V2 |
| businessAddress | POSTPONE | Not in DB -- V2 with receipt |
| businessPhone | POSTPONE | Same |
| businessEmail | REMOVE | No runtime use |
| businessWebsite | REMOVE | No runtime use |
| businessTaxId | POSTPONE | Needed for receipt -- V2 |
| dashboardLayout | REMOVE | Hardcoded layout |
| showQuickStats | REMOVE | Hardcoded sections |
| showRecentOrders | REMOVE | Same |
| showTopProducts | REMOVE | Same |
| enableTableManagement | REMOVE | Module system handles this |
| enableCustomerDisplay | REMOVE | Module system handles this |
| enableBarcode | REMOVE | Module system handles this |
| enableInventoryTracking | REMOVE | Module system handles this |
| enableCash | REMOVE | Module system handles this |
| enableCard | REMOVE | Module system handles this |
| enableMobile | REMOVE | Module system handles this |
| enableGiftCards | REMOVE | Module system handles this |
| enableMultiLocation | REMOVE | Not implemented |
| enableUserRoles | REMOVE | Auth system handles this |
| enableAuditLog | REMOVE | Not implemented |
| enableNotifications | REMOVE | Not consumed |
| enableCaching | REMOVE | Not consumed |
| lazyLoading | REMOVE | Not consumed |
| keyboardNavigation | REMOVE | Not consumed |
| reducedMotion | REMOVE | CSS uses media query |
| showProductImages | REMOVE | Not consumed |
| autoRefreshInterval | REMOVE | Not consumed |
| highContrastMode | REMOVE | Not consumed |
| largeTextMode | REMOVE | Not consumed |
| components.cards.borderRadius | MERGE | Merge with top-level borderRadius |
| components.cards.padding | KEEP | Works via getCardClasses |
| components.cards.shadowStyle | MERGE | Merge with shadowIntensity |
| components.buttons.style | KEEP | Works via getButtonClasses |
| components.buttons.size | KEEP | Works via getButtonClasses |
| components.buttons.hoverEffects | REMOVE | Not consumed |
| components.grid.columns | KEEP | Works via getGridClasses |
| components.grid.gap | KEEP | Works via getGridClasses |
| components.forms.inputStyle | KEEP | Works via getInputClasses |
| components.forms.inputSize | KEEP | Works via getInputClasses |
| components.forms.focusRing | REMOVE | Not consumed |
| brandWatermark | REMOVE | DB-only, never used |
| buttonStyle | REMOVE | DB-only, never used |
| cardStyle | REMOVE | DB-only, never used |
| customCSS | POSTPONE | Written but never injected -- V3 |
| hoverEffects | REMOVE | DB-only, never used |
| modalStyle | REMOVE | DB-only, never used |
| responsiveMode | REMOVE | DB-only, never used |
| showModuleBadges | REMOVE | DB-only, never used |
| showModuleIcons | REMOVE | DB-only, never used |
| showQuickActions | REMOVE | DB-only, never used |
| splashScreen | REMOVE | DB-only, never used |
| tableStyle | REMOVE | DB-only, never used |
| widgetSizes | REMOVE | DB-only, never used |
| autoModeSwitch | REMOVE | DB-only, never used |
| autoSave | REMOVE | DB-only, never used |
| backdropBlur | REMOVE | DB-only, never used |
| opacity | REMOVE | DB-only, never used |
| theme (dark/light) | POSTPONE | Dark mode in V2 |
| receiptHeader | POSTPONE | Wire to printer in V2 |
| receiptFooter | POSTPONE | Same |
| printReceiptAuto | POSTPONE | Same |
| receiptPaperWidth | POSTPONE | Same |
| receiptShowLogo | POSTPONE | Same |
| receiptShowBusinessInfo | POSTPONE | Same |
| receiptShowQR | POSTPONE | Same |
| receiptQRContent | POSTPONE | Same |
| receiptCopies | POSTPONE | Same |

### Summary

| Verdict | Count |
|---------|-------|
| KEEP | 30 |
| MERGE | 3 |
| REMOVE | 48 |
| POSTPONE | 14 |

---

## 4. New Personalization Features

### V1 -- Essential (Must Have)

| # | Feature | Description | Why Customers Want It |
|---|---------|-------------|----------------------|
| 1 | Brand Logo | Upload logo, auto-generate favicon | Every business wants their logo on their POS |
| 2 | Business Name | Displayed everywhere | Core identity |
| 3 | Primary Brand Color | Buttons, sidebar, active states | Brand recognition |
| 4 | Color Palette | 6-8 customizable colors | Full brand alignment |
| 5 | Font Selection | 6+ Google Fonts with preview | Professional appearance |
| 6 | Sidebar Style | Left / Top / Collapsed | Workflow preference |
| 7 | Card Style | Border radius + shadow | Visual feel |
| 8 | Button Style | Rounded / Square / Pill + size | Interaction feel |
| 9 | Module Selection | Enable/disable features | Business relevance |
| 10 | Sector Presets | Pre-configured themes per industry | Fast setup |
| 11 | Dark/Light Mode | Theme switch | Modern POS expect this |
| 12 | Currency and Tax | Localized money display | Legal requirement |
| 13 | Receipt Branding | Header text, footer message | Professional receipts |
| 14 | Compact Mode | Smaller spacing for dense screens | High-volume businesses |

### V2 -- Professional

| # | Feature | Description |
|---|---------|-------------|
| 15 | Receipt Designer | Full receipt layout with live preview |
| 16 | Custom Fonts | Upload TTF/OTF files |
| 17 | Icon Packs | Choose between Lucide, Phosphor, Tabler |
| 18 | Dashboard Layout | Grid / List / Minimal |
| 19 | Login Page Branding | Custom login background, welcome message |
| 20 | Loading Screen | Custom splash screen with logo |
| 21 | Status Badge Colors | Customize success/warning/error colors |
| 22 | Table Density | Compact / Normal / Comfortable row heights |
| 23 | Navigation Labels | Show/hide icons, show/hide text |
| 24 | Header Style | Minimal / Standard / Bold |
| 25 | Business Details | Address, phone for receipts |
| 26 | Keyboard Shortcuts | Custom shortcut bindings |
| 27 | Notification Style | Toast / Banner / Silent |
| 28 | Date/Time Format | Configurable display format |
| 29 | Language | French / English / Arabic |

### V3 -- Enterprise

| # | Feature | Description |
|---|---------|-------------|
| 30 | Custom CSS | Injected into generated POS |
| 31 | Custom JS | Injected scripts for integrations |
| 32 | Multi-Location | Different configs per location |
| 33 | Theme Versioning | Save/restore/revert themes |
| 34 | Theme Marketplace | Share/import community themes |
| 35 | White-Label | Remove CarthaPOS branding entirely |
| 36 | Window Appearance | Title bar color, window size |
| 37 | Business Wallpaper | Background image behind the POS |
| 38 | Kiosk Mode | Fullscreen with custom branding |
| 39 | Hardware Profiles | Save printer/drawer configs per station |
| 40 | A/B Theme Testing | Test two themes with real usage data |

---

## 5. Preview Redesign

### Current Problems

1. Admin preview uses Tailwind v4, generated POS uses v3
2. Different POSConfiguration files with different defaults
3. useThemeApplier absent from preview
4. CSS variables set on inline style vs :root
5. Demo data instead of realistic data
6. Missing features (discounts, held orders, receipt printing)

### Preview Redesign: Share Components

The preview MUST render the exact same components as the generated POS.

```
Admin Preview
    |
    v
Import from pos-template:
    POSNavbar.jsx, POSHeader.jsx, POSContent.jsx, POSWithAuth.jsx
    POSConfiguration.js, useThemeApplier.js, useAppConfig.js (mocked)
    |
    v
Same Tailwind config (v4 everywhere)
Same CSS variables (set on :root via useThemeApplier)
Same POSConfiguration (single file, not two copies)
Same component tree
```

### Preview Features

| Feature | Description | Priority |
|---------|-------------|----------|
| Device switching | Desktop (1200px), Tablet (768px), Mobile (375px) | V1 |
| Page tabs | Switch between Dashboard, Sales, Products, Settings | V1 |
| Live theme update | Changes appear instantly as user edits | V1 |
| Sector preset | Pre-populate with realistic demo data per sector | V1 |
| Full-screen toggle | Expand preview to fill screen | V1 |
| Before/After | Show original vs custom side-by-side | V2 |
| Dark/Light toggle | Preview both modes | V2 |
| Zoom | Scale preview 50%-150% | V2 |
| Undo/Redo | History of theme changes (Ctrl+Z / Ctrl+Y) | V2 |
| Screenshot | Export preview as PNG for client approval | V2 |
| Receipt preview | Show generated receipt in preview panel | V2 |
| Login screen preview | Show branded login screen | V2 |
| Multi-page | Show Dashboard + Sales + Products simultaneously | V3 |
| Preset comparison | Compare two themes side-by-side | V3 |

---

## 6. Settings Simplification

### New Category Structure

| Category | Settings | Tab Color | Description |
|----------|----------|-----------|-------------|
| Theme | 7 preset cards + custom | Blue | Starting point. One click to apply. |
| Colors | 8 color pickers | Green | Primary, secondary, accent, background, card, text, muted, border |
| Typography | Font, size, weight, line-height | Purple | Visual preview per option |
| Effects | Border radius, shadows, animation toggle + type | Orange | Only working options |
| Navigation | Position, width, collapsible | Teal | Sidebar configuration |
| Modules | Toggle switches with descriptions | Red | Feature enable/disable |
| Brand | Name, logo, app title, currency, tax | Gray | Business identity |
| Receipt | Header, footer, layout (V2 only) | Pink | Receipt customization |
| Advanced | Custom CSS, custom JS (V3 only) | Dark | Developer tools |

### Why This Organization

1. **Theme first** -- instant gratification. User picks a look in 2 seconds.
2. **Colors second** -- most common customization. Users know exactly what they want.
3. **Typography third** -- the second most impactful visual change.
4. **Effects fourth** -- polish and personality.
5. **Navigation fifth** -- structural choice that affects everything.
6. **Modules sixth** -- feature selection, not visual.
7. **Brand seventh** -- business info is important but less visual.
8. **Receipt eighth** -- niche, comes after brand info is set.
9. **Advanced last** -- power users only.

### Removed Categories

- **Components** (cards/buttons/grid/forms) -- too granular for V1. Cards inherit border radius + shadow from Effects. Buttons inherit style from a single Button Style dropdown.
- **Layout** (spacing, max width, compact mode) -- all fake. Remove entirely.
- **Hardware** -- not ready. Remove from personalization studio.

---

## 7. Features to Eliminate

### From the UI (Immediate)

| Feature | Location | Why Remove |
|---------|----------|------------|
| Debug panel in TypographyEditor | TypographyEditor.jsx:74 | Developer debug shown to users |
| Debug panel in VisualEffectsEditor | VisualEffectsEditor.jsx:140 | Same |
| Debug panel in LayoutEditor | LayoutEditor.jsx:87 | Same |
| Console.log in all handlers | Multiple files | Production noise |
| Enregistrer (Demo) button | ReceiptDesignerPreview.jsx:183 | Broken trust |
| AutoSave toggle | AdvancedSettings.jsx | Does nothing |
| AutoModeSwitch toggle | AdvancedSettings.jsx | Does nothing |
| CustomCSS textarea | AdvancedSettings.jsx | Never injected |
| Language dropdown | AdvancedSettings.jsx | No i18n system |
| Gradient backgrounds toggle | VisualEffectsEditor.jsx | No runtime consumer |
| Glass effect toggle | VisualEffectsEditor.jsx | No runtime consumer |
| Card animations section | VisualEffectsEditor.jsx | No runtime consumer |
| Spacing scale slider | LayoutEditor.jsx | CSS var set but unused |
| Max width dropdown | LayoutEditor.jsx | CSS var set but unused |
| Compact mode toggle | LayoutEditor.jsx | Not consumed |
| Navbar collapsible toggle | LayoutEditor.jsx | Not consumed |
| Sidebar collapsible toggle | LayoutEditor.jsx | Not consumed |
| Button hover effects toggle | LayoutEditor.jsx | Not consumed |
| Form focus ring toggle | LayoutEditor.jsx | Not consumed |
| Grid tab | LayoutEditor.jsx | Too granular for V1 |
| Forms tab | LayoutEditor.jsx | Too granular for V1 |

### From the Database

Remove 18 fields that have no generator or runtime consumer:
brandWatermark, buttonStyle, cardStyle, customCSS, hoverEffects, modalStyle, responsiveMode, showModuleBadges, showModuleIcons, showQuickActions, splashScreen, tableStyle, widgetSizes, autoModeSwitch, autoSave, backdropBlur, opacity, theme

### From the Generator

Remove all enable feature flags from ThemeCustomizer.updateAppConfig() (18 properties). Module visibility is controlled by the modules array, not config flags.

---

## 8. Version Roadmap

### V1: Polished Essentials (Weeks 1-6)

**Goal:** Every option works. Preview matches generated POS. Customer trusts the tool.

| Week | Task |
|------|------|
| 1 | Architecture: Create ThemeContext, unify POSConfiguration, standardize CSS variables |
| 1 | Delete: All fake options from UI, generator, and DB |
| 2 | Preview: Import pos-template components, use same Tailwind, same hooks |
| 2 | Remove debug panels and console.logs from all editors |
| 3 | Colors: Add textMutedColor and borderColor pickers with live swatches |
| 3 | Typography: Font preview in dropdown, sample text area |
| 4 | Effects: Merge border radius, add animation preview box |
| 4 | Navigation: Simplify to position + width |
| 5 | Brand: Wire business name, logo, currency to work end-to-end |
| 5 | Tax rate: Connect to Sales.jsx instead of hardcoded 0.20 |
| 6 | Modules: Add descriptions, visual previews per module |
| 6 | Wizard: Implement linear 8-step flow with progress bar |

**V1 delivers:** 30 working options. Preview matches POS. Clean UI. No fakes.

### V2: Professional Features (Weeks 7-12)

**Goal:** Receipt customization. Dark mode. Professional polish.

| Week | Task |
|------|------|
| 7-8 | Receipt designer: Wire to backend, persist config, connect thermal printer |
| 8-9 | Dark mode: Implement theme toggle, dark/light CSS variables |
| 9-10 | Login page branding: Custom background, welcome message |
| 10 | Language support: French, English, Arabic with i18n |
| 11 | Dashboard layout: Grid/List/Minimal options |
| 11 | Table density: Compact/Normal/Comfortable |
| 12 | Preview improvements: Before/After, zoom, undo/redo |

**V2 delivers:** Receipt customization, dark mode, language support, professional preview.

### V3: Enterprise (Weeks 13-18)

**Goal:** Full customization for power users and enterprises.

| Week | Task |
|------|------|
| 13-14 | Hardware settings: Real Electron IPC for printer, cash drawer |
| 14-15 | Custom CSS: Inject into generated POS with sandboxing |
| 15-16 | Custom fonts: Upload TTF/OTF, generate @font-face |
| 16-17 | Icon packs: Lucide, Phosphor, Tabler selection |
| 17-18 | Theme marketplace: Save/share/import community themes |

**V3 delivers:** Hardware integration, custom CSS/fonts, theme marketplace.

---

## 9. Final Architecture

### Single Source of Truth

```
config/defaults.js (NEW)
  |
  | Defines every personalization property with its:
  |   - Default value
  |   - Type (string, boolean, number)
  |   - Valid values (enum)
  |   - UI control type (color, slider, toggle, select)
  |   - Category (theme, colors, typography, effects, navigation, brand, receipt)
  |   - Whether it affects preview
  |   - Whether it affects generated POS
  |
  +-- Used by: Admin UI (for defaults + validation)
  +-- Used by: Generator (for merge + fallbacks)
  +-- Used by: Runtime (for normalization)
  +-- Used by: Preview (for rendering)
```

### Configuration Flow (Ideal)

```
Admin UI
  |
  | usePersonalization() hook
  |   - Reads from: usePOSConfiguration(licenseId)
  |   - Writes to: PUT /api/licenses/:id { configuration }
  |   - Validates: using config/defaults.js schema
  |   - Debounces: 500ms auto-save
  |
  v

Database
  |
  | LicenseConfiguration model
  |   - Only fields with V1 UI controls (30 fields)
  |   - Removed: 18 dead fields
  |   - Added: textMutedColor, borderColor, footerText, taxRate
  |
  v

Generator
  |
  | Single write to app-config.json (ThemeCustomizer only)
  |   - Removed: AssetManager.createConfigFile() duplicate write
  |   - Reads: config/defaults.js for fallback values
  |   - Writes: public/app-config.json (ONE file, ONE schema)
  |   - Writes: CSS variables to index.css (using --color-* convention)
  |   - Writes: tailwind.config.js (using CSS variable color mappings)
  |
  v

app-config.json (Single Schema)
  |
  | {
  |   "license": { "id", "key", "client" },
  |   "modules": [...],
  |   "theme": {
  |     "businessName": "...",
  |     "colors": {
  |       "primary": "#3B82F6",
  |       "secondary": "#1E40AF",
  |       "accent": "#F59E0B",
  |       "background": "#FFFFFF",
  |       "card": "#F9FAFB",
  |       "text": "#1F2937",
  |       "muted": "#6B7280",
  |       "border": "#E5E7EB"
  |     },
  |     "typography": {
  |       "fontFamily": "Inter",
  |       "fontSize": "14",
  |       "fontWeight": "400"
  |     },
  |     "effects": {
  |       "borderRadius": "medium",
  |       "shadows": true,
  |       "shadowIntensity": "medium"
  |     },
  |     "navigation": { "position": "left", "width": "64" },
  |     "animations": {
  |       "enabled": true,
  |       "type": "slide",
  |       "speed": "normal"
  |     },
  |     "business": { "currency": "EUR", "taxRate": 20 },
  |     "receipt": { "header": "...", "footer": "..." }
  |   },
  |   "database": { "type": "sqlite", "filename": "..." }
  | }
  |
  v

Runtime Theme Provider (NEW)
  |
  | ThemeProvider (React Context)
  |   - Loads app-config.json via useAppConfig()
  |   - Merges with config/defaults.js defaults
  |   - Normalizes flat/nested config shapes
  |   - Provides useTheme() hook to all components
  |   - Calls useThemeApplier() ONCE to set CSS variables
  |   - Single variable naming: --color-primary everywhere
  |
  v

Components
  |
  | Every component uses:
  |   const { colors, typography, effects, nav } = useTheme()
  |
  | No more:
  |   - useAppConfig() in every component
  |   - theme.primaryColor || theme.colors?.primary fallback chains
  |   - POSConfiguration.getStyleVars() in App.jsx
  |   - applyTheme() in ThemeWrapper
  |
  v

Preview (Same as Runtime)
  |
  | Preview imports pos-template components directly
  |   - Same POSConfiguration (single file)
  |   - Same useThemeApplier
  |   - Same Tailwind config
  |   - Same component tree
  |   - Preview = Generated POS (guaranteed)
  |
  v

Generated POS
  |
  | Identical to preview
  | app-config.json is the ONLY config source
  | CSS variables set via useThemeApplier on :root
  | Single Tailwind version (v4)
  | Single CSS variable naming (--color-*)
```

### Files to Create

| File | Purpose |
|------|---------|
| config/defaults.js | Single source of truth for all personalization properties |
| contexts/ThemeContext.jsx | React context providing theme to all components |
| hooks/useTheme.js | Hook returning normalized theme config |

### Files to Modify

| File | Changes |
|------|---------|
| App.jsx | Remove POSConfiguration.getStyleVars(), use ThemeProvider |
| Layout.jsx | Remove useThemeApplier call (moved to ThemeProvider) |
| POSNavbar.jsx | Use useTheme() instead of useAppConfig() |
| POSHeader.jsx | Same |
| POSContent.jsx | Same |
| POSWithAuth.jsx | Same |
| ThemeWrapper.jsx | Simplify or remove |
| config/theme.js | Remove (replaced by config/defaults.js) |
| config/AppConfig.js | Remove (replaced by ThemeProvider) |
| complete.css | Remove duplicate :root (keep one source) |
| custom.css | Remove duplicate :root |

### Files to Remove

| File | Reason |
|------|--------|
| config/theme.js | Replaced by config/defaults.js |
| config/AppConfig.js | Replaced by ThemeProvider |
| contexts/UserContext.jsx | Empty file |
| contexts/AuthContext-new.jsx | Empty file |
| styles/pos-styles.css | Empty file |
| styles/layout.css | Empty file |
| styles/dashboard.css | Empty file |
| styles/tailwind-v4.css | Empty file |
| backend/utils/theme/CSSGenerator.js | Empty placeholder |
| backend/utils/theme/ThemeConfigGenerator.js | Empty placeholder |
| backend/utils/theme/ComponentUpdater.js | Empty placeholder |
| backend/utils/theme/defaultThemes.js | Empty placeholder |
| admin/src/components/pos/customizer/PersonalizationForm.jsx | Empty file |

### Key Architecture Rules

1. **One config file** defines all defaults (config/defaults.js)
2. **One DB model** stores personalization (LicenseConfiguration, only V1 fields)
3. **One generator** writes app-config.json (ThemeCustomizer only)
4. **One React context** provides theme (ThemeContext)
5. **One hook** returns theme data (useTheme)
6. **One CSS variable convention** (--color-primary everywhere)
7. **One Tailwind version** (v4 everywhere)
8. **One POSConfiguration** (single file, not two copies)
9. **One preview** = same components as generated POS
10. **One source of truth** for defaults, validation, and rendering

---

*Document produced from comprehensive codebase analysis. All recommendations based on verified findings from PERSONALIZATION_AUDIT.md.*
