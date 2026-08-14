# CarthaPOS Personalization Studio - UI Specification

> Premium editor panel redesign. The live preview is untouched. Only the left-side editor and UX are redesigned.

---

## Table of Contents

1. [Design Principles](#1-design-principles)
2. [Overall Layout](#2-overall-layout)
3. [Category Navigation](#3-category-navigation)
4. [Property Panel System](#4-property-panel-system)
5. [Theme Selection](#5-theme-selection)
6. [Color Editor](#6-color-editor)
7. [Typography](#7-typography)
8. [Effects](#8-effects)
9. [Navigation Layout](#9-navigation-layout)
10. [Modules](#10-modules)
11. [Brand Identity](#11-brand-identity)
12. [Receipt](#12-receipt)
13. [Search System](#13-search-system)
14. [Undo / Redo](#14-undo--redo)
15. [Presets & Custom Themes](#15-presets--custom-themes)
16. [Favorites & Recently Edited](#16-favorites--recently-edited)
17. [Reset System](#17-reset-system)
18. [Micro-Interactions](#18-micro-interactions)
19. [Removals](#19-removals)
20. [Implementation Guide](#20-implementation-guide)

---

## 1. Design Principles

### Visual Language

| Principle | Description |
|-----------|-------------|
| **Minimal chrome** | No borders on cards. Use spacing and shadow hierarchy instead. |
| **Inline controls** | Every control is directly visible. No hidden behind dropdowns or modals. |
| **Visual over verbal** | Show the result, not a label describing the result. |
| **Instant feedback** | Every control change updates the preview in the same frame. |
| **Progressive depth** | Start simple. Reveal complexity only when the user asks for it. |
| **Consistent density** | All controls use the same compact spacing. No random padding. |

### Color System (Editor Panel)

```
Background:     #FFFFFF (light) / #1A1A1A (dark editor theme)
Surface:        #F7F7F8
Surface Hover:  #EDEDEE
Border:         #E5E5E5 (subtle, only for separators)
Text Primary:   #1A1A1A
Text Secondary: #6B6B6B
Text Tertiary:  #9A9A9A
Accent:         #2563EB (brand blue for active states)
Accent Surface: #EFF6FF
```

### Typography (Editor Panel)

```
Category Label:   11px / 600 weight / uppercase / letter-spacing 0.5px / #6B6B6B
Property Label:   12px / 500 weight / #1A1A1A
Property Value:   12px / 400 weight / #6B6B6B
Section Title:    13px / 600 weight / #1A1A1A
Description:      11px / 400 weight / #9A9A9A
```

### Spacing

```
Panel width:         320px (fixed)
Category gutter:     16px horizontal
Section gap:         24px vertical
Property gap:        12px vertical
Control gap:         8px between label and control
Card padding:        12px
Card gap:            8px
```

---

## 2. Overall Layout

### Structure

```
+------------------------------------------------------------------+
|  TOOLBAR                                                         |
|  [Search] [Undo] [Redo] [Favorites] [Presets] [Reset All]       |
+------------------------------------------------------------------+
|            |                                                     |
| CATEGORY   |                                                     |
| NAV        |              LIVE POS PREVIEW                       |
|            |                                                     |
| [Theme]    |                                                     |
| [Colors]   |            (unchanged)                             |
| [Typo]     |                                                     |
| [Effects]  |                                                     |
| [Nav]      |                                                     |
| [Modules]  |                                                     |
| [Brand]    |                                                     |
| [Receipt]  |                                                     |
|            |                                                     |
+------------------------------------------------------------------+
|  PROPERTY PANEL (scrolls independently)                          |
|  Shows controls for the selected category                        |
+------------------------------------------------------------------+
```

### Layout Rules

1. The preview panel fills all available width minus the editor panel
2. The editor panel is exactly 320px wide
3. The category nav is 48px wide (icon + label)
4. The property panel is 272px wide (320 - 48)
5. The toolbar is full-width at the top
6. The property panel scrolls independently with smooth scrolling
7. The preview never moves, resizes, or re-renders when the editor changes

### File Locations

| Component | New File |
|-----------|----------|
| EditorShell | `admin/src/components/customizer/v2/EditorShell.jsx` |
| CategoryNav | `admin/src/components/customizer/v2/CategoryNav.jsx` |
| PropertyPanel | `admin/src/components/customizer/v2/PropertyPanel.jsx` |
| Toolbar | `admin/src/components/customizer/v2/Toolbar.jsx` |
| ThemeSelector | `admin/src/components/customizer/v2/panels/ThemePanel.jsx` |
| ColorEditor | `admin/src/components/customizer/v2/panels/ColorPanel.jsx` |
| TypographyEditor | `admin/src/components/customizer/v2/panels/TypographyPanel.jsx` |
| EffectsEditor | `admin/src/components/customizer/v2/panels/EffectsPanel.jsx` |
| NavigationEditor | `admin/src/components/customizer/v2/panels/NavigationPanel.jsx` |
| ModulesEditor | `admin/src/components/customizer/v2/panels/ModulesPanel.jsx` |
| BrandEditor | `admin/src/components/customizer/v2/panels/BrandPanel.jsx` |
| ReceiptEditor | `admin/src/components/customizer/v2/panels/ReceiptPanel.jsx` |
| SearchBar | `admin/src/components/customizer/v2/SearchBar.jsx` |
| useUndoRedo | `admin/src/components/customizer/v2/hooks/useUndoRedo.js` |
| useFavorites | `admin/src/components/customizer/v2/hooks/useFavorites.js` |
| useRecentEdits | `admin/src/components/customizer/v2/hooks/useRecentEdits.js` |

---

## 3. Category Navigation

### Design

The category nav is a narrow vertical strip on the far left of the editor. Each category is represented by an icon and a short label.

### Behavior

- Active category has a blue left border (2px) and blue background tint
- Hover shows a subtle background highlight
- Clicking a category scrolls the property panel to that section
- Categories can be collapsed to icon-only mode (click collapse arrow)

### Category Order

| Order | Category | Icon | Label |
|-------|----------|------|-------|
| 1 | Theme | Palette | Theme |
| 2 | Colors | Droplets | Colors |
| 3 | Typography | Type | Typo |
| 4 | Effects | Sparkles | Effects |
| 5 | Navigation | PanelLeft | Nav |
| 6 | Modules | LayoutGrid | Modules |
| 7 | Brand | Building2 | Brand |
| 8 | Receipt | Receipt | Receipt |

### Visual

```
+------+
|  🎨  |  <- active (blue left border, light blue bg)
+------+
|  🖌️  |
+------+
|  Aa  |
+------+
|  ✨  |
+------+
|  ☰   |
+------+
|  ▦   |
+------+
|  🏢  |
+------+
|  🧾  |
+------+
```

### Component

```jsx
// CategoryNav.jsx
const categories = [
  { id: 'theme',     icon: Palette,      label: 'Theme' },
  { id: 'colors',    icon: Droplets,     label: 'Colors' },
  { id: 'typography', icon: Type,         label: 'Typo' },
  { id: 'effects',   icon: Sparkles,     label: 'Effects' },
  { id: 'navigation', icon: PanelLeft,    label: 'Nav' },
  { id: 'modules',   icon: LayoutGrid,   label: 'Modules' },
  { id: 'brand',     icon: Building2,    label: 'Brand' },
  { id: 'receipt',   icon: Receipt,      label: 'Receipt' },
];
```

---

## 4. Property Panel System

### Section Structure

Every category renders into the same PropertyPanel container. The panel has:

1. **Section header** -- category name + optional description
2. **Property groups** -- related controls grouped in cards
3. **Individual properties** -- label + control

### Property Card

Each property group is rendered as a subtle card:

```
+----------------------------------+
|  Section Title                    |
|                                   |
|  Property Label    [ Control ]   |
|  Property Label    [ Control ]   |
|  Property Label    [ Control ]   |
|                                   |
+----------------------------------+
```

Card styling:
- Background: transparent (no card border)
- Bottom border: 1px solid #E5E5E5 (separator between groups)
- Padding: 16px 0 (vertical rhythm)

### Property Row

Each individual property is a row:

```
Label (left, 12px, 500 weight)
Control (right-aligned or full-width below)
```

For simple controls (toggles, small inputs): label and control on the same line.
For complex controls (color pickers, visual selectors): label on top, control below full-width.

### Scroll Behavior

- Property panel scrolls vertically with `overflow-y: auto`
- Scrollbar is hidden by default, shown on hover (thin, 4px width)
- Smooth scrolling when jumping to a section via category click
- Scroll position resets when switching categories (scroll to top)

---

## 5. Theme Selection

### Design

Theme selection is the first panel. It shows preset themes as premium cards in a 2-column grid.

### Theme Card

Each card is a mini preview of the theme:

```
+-------------------------------+
|                               |
|  [Color dots: 5 colors]      |
|                               |
|  Theme Name                   |
|  Description (1 line)         |
|                               |
|  Font: Inter | Radius: 8px   |
|                               |
+-------------------------------+
```

### Card Styling

- Size: ~128px wide, ~100px tall
- Border: 2px solid transparent
- Hover: border becomes #E5E5E5, subtle shadow
- Active/Selected: border becomes #2563EB (accent blue)
- Click: immediately applies theme to preview

### Color Dots

Show 5 small circles (12px each) at the top of the card:
- primary, secondary, accent, background, text
- Arranged in a horizontal row with 4px gap

### Card Interaction

```
Hover:
  - Border transitions to #E5E5E5 (150ms ease)
  - Card lifts slightly (translateY(-1px), shadow increase)
  - Color dots scale up slightly (scale 1.05)

Click:
  - Border transitions to #2563EB
  - Brief scale pulse (scale 1.02 then back to 1.0, 200ms)
  - Preview updates instantly
  - If user has custom colors: show tiny "Reset" toast "Custom theme replaced"

Selected state:
  - Blue border
  - Small blue check icon in top-right corner
  - "Actuel" badge below the name
```

### Custom Theme Card

The 7th card is "Personnalise":

```
+-------------------------------+
|                               |
|  [Your current color dots]    |
|                               |
|  Personnalise                 |
|  Votre theme personnalise     |
|                               |
|  Basulez aux couleurs pour    |
|  personnaliser                |
|                               |
+-------------------------------+
```

- Always shows current custom colors
- Clicking it does nothing (user is already customizing)
- Shows a subtle glow effect when user has manually changed colors from a preset

### Grid Layout

```
[Theme 1] [Theme 2]
[Theme 3] [Theme 4]
[Theme 5] [Theme 6]
[Custom ]
```

Gap: 8px between cards.

---

## 6. Color Editor

### Design

The color panel is a vertical list of color properties. Each color has a large swatch, hex input, and visual label.

### Color Property Row

```
Primary
+--------+------------------+
|        |                  |
| [████] | #3B82F6         |
|        |                  |
+--------+------------------+
Boutons, elements principaux
```

Each row contains:
1. **Label** (top, 12px, 500 weight) -- "Primary", "Secondary", etc.
2. **Swatch** (40x40px, rounded 8px) -- shows current color
3. **Hex input** (text input, monospace, right-aligned)
4. **Description** (bottom, 11px, #9A9A9A) -- what this color affects

### Color Picker Popover

Clicking the swatch opens a popover color picker:

```
+-------------------------------+
|  [Color wheel / gradient]     |
|                               |
|  Hue slider [========]       |
|  Opacity slider [=====]      |
|                               |
|  HEX: #3B82F6                |
|  RGB: 59, 130, 246           |
|                               |
|  Suggested:                   |
|  [■][■][■][■][■][■]          |
|                               |
|  Recent:                      |
|  [■][■][■][■]                |
|                               |
+-------------------------------+
```

### Color Properties

| Order | Label | Description | CSS Variable |
|-------|-------|-------------|--------------|
| 1 | Primaire | Boutons, sidebar, elements actifs | --color-primary |
| 2 | Secondaire | Elements de soutien, cartes | --color-secondary |
| 3 | Accent | Notifications, alertes, highlights | --color-accent |
| 4 | Arriere-plan | Fond principal de l'application | --color-background |
| 5 | Cartes | Fond des cartes et panneaux | --color-card |
| 6 | Texte | Texte principal | --color-text |
| 7 | Texte muted | Texte secondaire, descriptions | --color-text-muted |
| 8 | Bordures | Bordures des cartes, separateurs | --color-border |

### Suggested Colors

Based on the current primary color, generate a harmonious palette:
- Complementary color
- Analogous colors (2)
- Triadic colors (2)
- Lighter shade
- Darker shade

### Recent Colors

Store last 8 used colors in localStorage. Show as small circles (20px).

### Reset Per-Color

Each color row has a tiny reset icon (16px) on the right side. Clicking resets that single color to the current theme preset default. Icon is only visible on hover.

---

## 7. Typography

### Font Selector

Instead of a dropdown, show font options as visual cards:

```
+----------------------------------+
|  Inter                           |  <- rendered in Inter font
|  Moderne, lisible                |
+----------------------------------+
|  Poppins                         |  <- rendered in Poppins font
|  Arrondie, amicale               |
+----------------------------------+
|  Montserrat                      |  <- rendered in Montserrat font
|  Elegante, professionnelle       |
+----------------------------------+
|  Roboto                          |  <- rendered in Roboto font
|  Neutre, polyvalente             |
+----------------------------------+
|  Open Sans                       |  <- rendered in Open Sans font
|  Claire, accessible              |
+----------------------------------+
|  Lato                            |  <- rendered in Lato font
|  Humaine, chaleureuse            |
+----------------------------------+
```

Each card:
- Font name rendered in that font (loaded via Google Fonts link in the preview)
- Description in secondary text
- Height: 48px
- Active: blue left border + light blue background
- Hover: subtle background highlight

### Font Preview Sample

Below the font selector, show a live preview:

```
Aa Bb Cc 123
The quick brown fox jumps over the lazy dog

The bold brown fox JUMPS over the lazy dog
```

Rendered in the currently selected font, size, and weight. This updates instantly when any typography setting changes.

### Font Size

Instead of a slider, use a segmented control:

```
[ 12 ] [ 13 ] [ 14 ] [ 15 ] [ 16 ] [ 18 ] [ 20 ]
```

Each segment is a button. Active segment is highlighted blue. Click to select.

### Font Weight

Segmented control:

```
[ Light 300 ] [ Normal 400 ] [ Medium 500 ] [ Semi 600 ] [ Bold 700 ]
```

### Line Height

Segmented control:

```
[ Compact 1.2 ] [ Normal 1.5 ] [ Relaxed 1.8 ] [ Loose 2.0 ]
```

---

## 8. Effects

### Border Radius

Visual card selector. Each card shows a rectangle with the corresponding border radius:

```
+--------+  +--------+  +--------+  +--------+  +--------+
|        |  | .      |  | .      |  | .      |  | .      |
|        |  |        |  |        |  |        |  |        |
|        |  |        |  |        |  |        |  |        |
+--------+  +--------+  +--------+  +--------+  +--------+
 Square     Slight     Medium     Rounded      Pill
  0px        4px        8px       12px         16px
```

Each card:
- 56px wide, 40px tall
- Shows a rectangle with the actual border radius
- Label below (11px)
- Active: blue border
- Hover: subtle border

### Shadow

Visual card selector. Each card shows a box with the actual shadow:

```
+--------+  +--------+  +--------+  +--------+  +--------+
|        |  |        |  |        |  |        |  |        |
|        |  |        |  |        |  |        |  |        |
|        |  |        |  |        |  |        |  |        |
+--------+  +--------+  +--------+  +--------+  +--------+
  None        Light      Medium     Strong      Floating
```

Each card:
- 56px wide, 40px tall
- Shows a white card with the actual shadow
- Active: blue border
- Hover: shadow becomes more visible

### Shadows Toggle

A single toggle: "Activer les ombres"
- Below: shadow intensity selector (only visible when shadows are on)

### Animation Toggle

A single toggle: "Activer les animations"
- Below: animation type selector (only visible when animations are on)

### Animation Type

Visual cards showing a small animated preview:

```
+--------+  +--------+  +--------+  +--------+
| ->     |  | *      |  | (fade) |  |  none  |
| slide  |  | glow   |  |  fade  |  |  none  |
+--------+  +--------+  +--------+  +--------+
```

Each card has a small 24x24 icon that performs the actual animation on hover.

### Animation Speed

Segmented control:

```
[ Slow 300ms ] [ Normal 200ms ] [ Fast 100ms ]
```

---

## 9. Navigation Layout

### Layout Selector

Show 3 visual wireframes as selectable cards:

```
+------------------+  +------------------+  +------------------+
| [  ] [====]      |  | [========]       |  | [  ] [=]        |
| [  ] content     |  | content          |  | [  ] content     |
| [  ]             |  |                  |  | [=]              |
| Left Sidebar     |  | Top Navbar       |  | Compact          |
+------------------+  +------------------+  +------------------+
```

Each card:
- 88px wide, 64px tall
- Shows a miniature wireframe of the layout
- Active: blue border
- Hover: wireframe highlights

### Sidebar Width

Segmented control (only visible when sidebar layout is selected):

```
[ Narrow 48px ] [ Normal 64px ] [ Wide 80px ]
```

### Collapsible Toggle

Single toggle: "Barre laterale retractable"

---

## 10. Modules

### Module Cards

Each module is a feature card:

```
+------------------------------------------+
|  [icon]  Inventory                       |
|          Gestion des stocks et produits  |
|                                    [==]  |
+------------------------------------------+
|  [icon]  Clients                         |
|          Gestion de la base clients      |
|                                    [==]  |
+------------------------------------------+
|  [icon]  Rapports                        |
|          Statistiques et ventes          |
|                                    [==]  |
+------------------------------------------+
```

Each card:
- Full width
- Left: module icon (20x20, muted color)
- Center: module name (13px, 500) + description (11px, #9A9A9A)
- Right: toggle switch
- Enabled: normal colors
- Disabled: faded (opacity 0.5)
- Toggle on/off immediately updates preview navigation

### Module List

| Order | Module | Icon | Description |
|-------|--------|------|-------------|
| 1 | Tableau de bord | LayoutDashboard | Vue d'ensemble des ventes |
| 2 | Ventes | ShoppingCart | Point de vente et transactions |
| 3 | Produits | Package | Catalogue de produits |
| 4 | Clients | Users | Gestion de la base clients |
| 5 | Inventaire | Warehouse | Gestion des stocks |
| 6 | Codes-barres | Barcode | Scan et impression |
| 7 | Rapports | BarChart3 | Statistiques et analyses |
| 8 | Rapide | Zap | Service rapide (fast food) |
| 9 | A emporter | Coffee | Commandes a emporter |
| 10 | Tables | Utensils | Gestion de tables (restaurant) |
| 11 | Cuisine | ChefHat | Affichage cuisine |
| 12 | Menu | BookOpen | Gestion du menu |
| 13 | Fidelite | Heart | Programme de fidelite |
| 14 | Cartes cadeaux | Gift | Systeme de cartes cadeaux |
| 15 | Fournisseurs | Truck | Gestion des fournisseurs |
| 16 | Production | Bezier | Suivi de production |
| 17 | Ordonnances | FileText | Ordonnances (pharmacie) |
| 18 | Paiement | CreditCard | Paiements avances |
| 19 | Utilisateurs | Shield | Gestion des utilisateurs |
| 20 | Parametres | Settings | Configuration systeme |

### Core Modules (Cannot Disable)

These are always enabled and shown without a toggle:
- Tableau de bord
- Ventes
- Produits
- Parametres

---

## 11. Brand Identity

### Logo Upload

```
+------------------------------------------+
|                                           |
|     +---------------------------+        |
|     |                           |        |
|     |      [Logo Preview]       |        |
|     |      or                   |        |
|     |   [Glissez votre logo]   |        |
|     |                           |        |
|     +---------------------------+        |
|                                           |
|  PNG ou JPG. Max 2MB. 128x128px ideal.  |
|                                           |
+------------------------------------------+
```

- Drag & drop zone with dashed border
- Hover: border becomes solid blue
- Drop: logo appears with fade-in animation
- Logo displayed at max 80x80px with object-fit contain
- Delete button (X) in top-right corner of logo
- File size validation: max 2MB
- Format validation: image/* only

### Business Name

```
Nom du commerce
[________________________________]
```

Simple text input. Required field. Updates preview header, sidebar, and title instantly.

### App Title

```
Titre de l'application
[________________________________]
```

Text input. Updates document.title in preview instantly. Shows placeholder "Mon Commerce - POS".

### Currency

Segmented control:

```
[ EUR ] [ USD ] [ GBP ] [ TND ] [ MAD ] [ DZD ] [ XOF ]
```

### Tax Rate

```
Taux de TVA
[____] %
```

Number input with % suffix. Range: 0-100. Step: 0.5.

---

## 12. Receipt

### Structure

Keep the existing ReceiptDesignerPreview exactly as-is for the receipt preview rendering. Only restyle the editor controls.

### Control Restyling

Replace all native selects and toggles with:

**Toggles:** Custom toggle switch (pill shape, blue when on, gray when off)
**Selects:** Segmented controls where 3-4 options exist. Dropdown for longer lists.
**Inputs:** Clean text inputs with 1px border, rounded 6px, 32px height

### Section Grouping

```
En-tete du ticket
  Largeur du papier    [ 58mm ] [ 80mm ]
  Afficher le logo     [==]
  Nom                  [==]  [______________]
  Adresse              [==]  [______________]
  Telephone            [==]  [______________]
  TVA / SIRET          [==]  [______________]

Contenu
  Date et heure        [==]
  Numero de ticket     [==]
  Nom du caissier      [==]
  Quantite             [==]
  Prix unitaire        [==]
  Total ligne          [==]

Pied de page
  Sous-total           [==]
  TVA                  [==]
  Total                [==]
  Messages personalises [+ Ajouter]

Avance
  Impression auto      [==]
  Couper le papier     [==]
  Ouvrir le tiroir     [==]
```

---

## 13. Search System

### Search Bar

Located in the toolbar, full width:

```
+------------------------------------------+
|  Rechercher un parametre...              |
+------------------------------------------+
```

### Behavior

- Clicking the search bar focuses it and dims the category nav
- Typing filters categories and properties
- Results show as a flat list with category breadcrumbs
- Clicking a result:
  1. Switches to the correct category
  2. Scrolls to the matching property
  3. Briefly highlights the property row (blue glow, 1s fade)

### Search Index

Every property has:
- French label (e.g., "Couleur principale")
- English keyword (e.g., "primary color")
- Category name
- CSS variable name (e.g., "--color-primary")

Search matches against all of these.

### Examples

| Query | Results |
|-------|---------|
| "shadow" | Effects > Ombres |
| "font" | Typography > Police principale |
| "primary" | Colors > Primaire |
| "navbar" | Navigation > Position de la navigation |
| "module" | Modules > (shows all module cards) |
| "receipt" | Receipt > (shows receipt section) |
| "business" | Brand > Nom du commerce |
| "currency" | Brand > Devise |

---

## 14. Undo / Redo

### State History

Maintain a history stack of configuration states:

```
history: [state0, state1, state2, ...currentState]
currentIndex: number
```

### Keyboard Shortcuts

- `Ctrl+Z` -- Undo (go back one step)
- `Ctrl+Shift+Z` or `Ctrl+Y` -- Redo (go forward one step)

### Toolbar Buttons

```
[Undo icon] [Redo icon]
```

- Disabled (grayed out) when at the start/end of history
- Hover: subtle background
- Click: single step undo/redo

### History Debounce

Don't record every keystroke. Debounce text inputs at 500ms. Record immediately for:
- Color changes
- Toggle changes
- Select changes
- Theme preset application

### Max History

Keep last 50 states. Older states are discarded.

---

## 15. Presets & Custom Themes

### Custom Theme Saving

After the 6 preset themes, add a "Save as Preset" card:

```
+-------------------------------+
|                               |
|  [+]                          |
|                               |
|  Enregistrer comme preset     |
|  Sauvegardez votre theme      |
|                               |
+-------------------------------+
```

Clicking it:
1. Opens a small popover: "Nom du preset"
2. Text input for name
3. "Save" button
4. Saves current configuration to localStorage
5. New preset card appears in the grid

### Custom Preset Card

```
+-------------------------------+
|  [color dots]                 |
|                               |
|  Coffee Shop                  |
|  [Edit] [Delete]              |
+-------------------------------+
```

- Same size as built-in theme cards
- Has edit/delete on hover
- Edit: opens a rename popover
- Delete: removes from localStorage

### Storage

Custom presets stored in `localStorage.setItem('carthapos-custom-themes', JSON.stringify([...]))`.

Max 10 custom presets.

---

## 16. Favorites & Recently Edited

### Favorites (Pinned Settings)

Users can pin frequently-used settings to the top of the panel.

**Pin mechanism:** Each property row has a tiny star icon (12px) on hover. Clicking it pins the property.

**Pinned section:** Appears at the top of the property panel when any favorites exist:

```
Favoris
  [Star] Primaire         [#3B82F6]
  [Star] Police           [Inter]
  [Star] Position nav     [Gauche]
---
```

Clicking the star again unpins.

### Recently Edited

Below favorites, show last 5 edited properties:

```
Recemment modifies
  Primaire         [#3B82F6]     il y a 2 min
  Police           [Poppins]     il y a 5 min
  Border radius    [Medium]      il y a 8 min
```

Clicking jumps to that property in its category.

### Storage

Both stored in localStorage.

---

## 17. Reset System

### Three Levels of Reset

**1. Reset Property**
- Tiny reset icon (14px) next to each property on hover
- Resets that single property to the theme preset default
- No confirmation needed

**2. Reset Category**
- Reset link in each category section header
- Resets all properties in that category
- Brief toast: "Category reset"

**3. Reset All**
- "Reinitialiser" button in the toolbar
- Resets everything to the default theme
- Confirmation popover: "Reinitialiser toutes les personnalisations?"
- Two buttons: "Annuler" / "Reinitialiser" (red)

---

## 18. Micro-Interactions

### Global Transitions

```css
/* All interactive elements */
transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

/* Color swatches */
transition: transform 150ms ease, box-shadow 150ms ease;

/* Theme cards */
transition: border-color 150ms ease, transform 150ms ease, box-shadow 150ms ease;

/* Category nav */
transition: background-color 100ms ease, border-color 100ms ease;

/* Toggle switches */
transition: background-color 200ms ease, transform 200ms ease;
```

### Specific Interactions

| Element | Interaction |
|---------|------------|
| Theme card click | Scale pulse: 1.0 -> 1.02 -> 1.0 (200ms) |
| Color swatch hover | Scale up to 1.05 (150ms) |
| Toggle switch | Smooth slide animation (200ms) |
| Category nav item | Background fades in (100ms) |
| Property highlight (search) | Blue glow box-shadow, fades out over 1s |
| Undo/Redo button | Subtle rotation on click (-10deg, 150ms) |
| Star pin | Scale bounce: 1.0 -> 1.3 -> 1.0 (200ms) |
| Module toggle | Card opacity fades (150ms) |
| Search results | Slide in from left (200ms) |
| Toast notification | Slide up from bottom (200ms), auto-dismiss after 2s |

### Easing Functions

- **Entrance:** `cubic-bezier(0.0, 0.0, 0.2, 1)` -- decelerate
- **Exit:** `cubic-bezier(0.4, 0.0, 1, 1)` -- accelerate
- **Standard:** `cubic-bezier(0.4, 0, 0.2, 1)` -- smooth

---

## 19. Removals

### From All Editors

Remove completely:
- All `console.log` statements
- All debug panels (TypographyEditor:74, VisualEffectsEditor:140, LayoutEditor:87)
- All technical/developer wording
- Raw JSON dumps
- CSS variable debug displays
- "Demo" labels
- "Enregistrer (Demo)" button

### Files to Delete

| File | Reason |
|------|--------|
| `admin/src/components/pos/customizer/PersonalizationForm.jsx` | Empty file |
| `admin/src/components/customizer/DragDropManager.jsx` | Replaced by category system |
| `admin/src/components/customizer/CustomizerNavigation.jsx` | Replaced by CategoryNav |
| `admin/src/components/customizer/CustomizerHeader.jsx` | Replaced by Toolbar |

### Files to Rewrite (v2)

| File | Changes |
|------|---------|
| `admin/src/components/pos/customizer/POSCustomizer.jsx` | Complete rewrite as EditorShell |
| `admin/src/components/customizer/ThemeSelector.jsx` | Rewrite with visual cards |
| `admin/src/components/customizer/ColorPaletteEditor.jsx` | Rewrite with swatches |
| `admin/src/components/customizer/TypographyEditor.jsx` | Rewrite with font preview |
| `admin/src/components/customizer/VisualEffectsEditor.jsx` | Rewrite with visual cards |
| `admin/src/components/customizer/LayoutEditor.jsx` | Rewrite with wireframes |
| `admin/src/components/customizer/AdvancedSettings.jsx` | Rewrite as BrandPanel |

---

## 20. Implementation Guide

### Phase 1: Shell (Week 1)

Create the EditorShell, CategoryNav, PropertyPanel, and Toolbar components. Wire them to the existing POSConfiguration state. No visual changes to property controls yet -- just the new layout.

**Deliverable:** New shell wrapping existing controls. Categories switch panels.

### Phase 2: Theme + Colors (Week 2)

Rewrite ThemeSelector with visual cards. Rewrite ColorPaletteEditor with large swatches and hex inputs. Add color picker popover.

**Deliverable:** Premium theme selection and color editing experience.

### Phase 3: Typography + Effects (Week 3)

Rewrite TypographyEditor with font preview cards and segmented controls. Rewrite VisualEffectsEditor with visual border-radius/shadow/animation cards.

**Deliverable:** Visual property editors for typography and effects.

### Phase 4: Navigation + Modules + Brand (Week 4)

Rewrite LayoutEditor as NavigationPanel with wireframe cards. Rewrite ModulesPanel with feature cards. Rewrite BrandPanel with logo upload and clean inputs.

**Deliverable:** All categories redesigned.

### Phase 5: Search + Undo + Favorites (Week 5)

Implement search bar with property indexing. Implement undo/redo history. Implement favorites and recently edited.

**Deliverable:** Power-user features complete.

### Phase 6: Polish + Presets + Reset (Week 6)

Add custom theme saving. Add reset system. Add micro-interactions. Remove all debug code. Final QA pass.

**Deliverable:** Production-ready personalization studio.

### Component Tree (Final)

```
EditorShell
  Toolbar
    SearchBar
    UndoRedo
    PresetManager
    ResetAll
  CategoryNav
    CategoryItem (x8)
  PropertyPanel
    FavoritesSection (conditional)
    RecentSection (conditional)
    ThemePanel
    ColorPanel
    TypographyPanel
    EffectsPanel
    NavigationPanel
    ModulesPanel
    BrandPanel
    ReceiptPanel
  POSRealtimePreview (UNCHANGED)
    POSPreview (UNCHANGED)
```

### State Management

```
// Central state (unchanged from current)
formData.configuration = { ... }

// New: History stack
const { undo, redo, canUndo, canRedo } = useUndoRedo(formData.configuration);

// New: Favorites
const { favorites, toggleFavorite } = useFavorites();

// New: Recent edits
const { recent, trackEdit } = useRecentEdits();

// New: Search
const { query, results, setSearchQuery } = usePropertySearch();

// New: Custom presets
const { presets, savePreset, deletePreset } = useCustomPresets();
```

### Key Constraint

The POSRealtimePreview and all its children (POSPreview, POSContent, POSHeader, POSNavbar, all preview modules) remain EXACTLY as they are today. The v2 editor panels only update the formData.configuration state, which the existing preview already consumes. No preview changes needed.

---

*Specification for CarthaPOS Personalization Studio UI redesign. The live preview is untouched. Only the editor panel and UX are redesigned.*
