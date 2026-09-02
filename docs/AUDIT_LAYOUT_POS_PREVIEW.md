# Audit — Section "Layout" du Customizer (Personnalisation POS, Panneau Admin)

**Périmètre** : `admin/src/components/customizer/LayoutEditor.jsx` (4 onglets, 16 contrôles) et leur impact réel sur l'aperçu POS en direct (`admin/src/components/pos/preview/*`).
**Date** : investigation + corrections faites dans cette session.
**Statut global** : les 16 contrôles étaient fonctionnels à des degrés très divers avant correction — voir la colonne *Avant fix*. Les corrections apportées sont documentées dans la colonne *Après fix* ; celles marquées 🟡 sont implémentées via le même mécanisme que celles vérifiées mais n'ont pas été re-testées visuellement une par une (voir section [Limites](#limites-de-cet-audit) en fin de document).

## Cause racine (avant correction)

Le système avait été construit en deux moitiés jamais reliées :
1. `LayoutEditor.jsx` (UI) + `POSConfiguration.js` (schéma de config + 5 méthodes `get*Classes()`) + une injection partielle de variables CSS dans `POSContent.jsx`.
2. Les pages de l'aperçu (`admin/src/components/pos/preview/modules/*.jsx`), jamais mises à jour pour consommer ce système.

Preuve directe : `admin/src/docs/layout-components-guide.md` (laissé dans le repo) se termine par une section *"Phase Suivante : Appliquer les classes dans les composants de preview, Tester l'impact visuel en temps réel"* — jamais faite. Confirmé par grep : `getCardClasses/getButtonClasses/getGridClasses/getInputClasses/getLayoutClasses` n'étaient appelées **nulle part** dans le code réel.

---

## Onglet 1 — Général

| Contrôle | Clé config | Composant(s) POS impacté(s) | Avant fix | Après fix |
|---|---|---|---|---|
| **Position de la navigation** | `navbarPosition` (`left`/`top`/`right`) | `POSNavbar.jsx` (bascule overlay vs barre horizontale) + `POSPreview.jsx` (`layoutFlexDirection` du conteneur racine) | ✅ Fonctionnel | ✅ Inchangé |
| **Espacement global** | `spacingScale` (0.5–2x) | *Aucun* — stocké, valeur par défaut définie dans `POSRealtimePreview.jsx`, jamais lu ailleurs | ❌ Mort | ✅ `POSContent.jsx` — multiplie le padding vertical du wrapper de contenu (`contentStyle.paddingTop/paddingBottom`) |
| **Largeur maximale du contenu** | `maxWidth` (1024px→100%) | *Aucun* — même défaut jamais lu | ❌ Mort | ✅ `POSContent.jsx` — `max-width` + centrage (`margin: auto`) sur le wrapper de contenu |
| **Mode compact** | `compactMode` (bool) | `POSContent.jsx` ligne ~119 (avant fix), logique `contentStyle` (après fix) | ⚠️ Effet réel mais minime : ne réduisait que le padding haut/bas de page (`pt-3 pb-4` → `py-1.5`) | ⚠️ **Toujours limité au même effet** — non étendu à un espacement "plus dense" dans le reste des pages (voir Limites) |
| **Navigation rétractable** | `navbarCollapsible` (bool) | `POSNavbar.jsx` (`navCollapsible`, active le bouton de repli de la barre d'icônes) | ✅ Fonctionnel | ✅ Inchangé |

---

## Onglet 2 — Composants → Cartes et Conteneurs

| Contrôle | Clé config | Composant(s) POS impacté(s) | Avant fix | Après fix |
|---|---|---|---|---|
| **Arrondi des bordures** | `components.cards.borderRadius` (none→full) | Variable CSS `--pos-card-border-radius` (`POSContent.jsx`) ciblant seulement `div[class*="rounded-lg"].bg-white` / `.rounded-xl.bg-white` (divs codés en dur, pas shadcn) | ⚠️ N'atteignait que les pages "anciennes" (hors shadcn) | ✅ Atteint aussi `[data-slot="card"]` (shadcn `<Card>`, utilisé par la majorité des pages) **+** synchronisé avec la variable globale `--radius` de shadcn ajoutée lors du fix Thème (donc les boutons/cartes shadcn en général suivent aussi ce réglage) |
| **Espacement interne des cartes** | `components.cards.padding` (0.5–2x) | Idem — variable `--pos-card-padding`, même sélecteur restreint | ⚠️ Idem — n'atteignait pas les cartes shadcn | ✅ Étendu à `[data-slot="card-content"]` (zone de contenu réelle des cartes shadcn) — 🟡 non re-testé visuellement après le fix |
| **Style d'ombre** | `components.cards.shadowStyle` (none/soft/default/hard/colored) | Variable `--pos-card-shadow`, même sélecteur restreint. **Doublon avec** `shadowIntensity` (onglet Thème), échelle et vocabulaire différents, sur la même propriété CSS | ⚠️ Portée restreinte + **conflit silencieux** avec le réglage Thème | ✅ Portée étendue (comme ci-dessus) **et** doublon résolu : `shadowStyle` ne garde que `'none'`/`'colored'` comme variantes explicites par carte ; sinon il hérite de l'ombre calculée par `shadowIntensity` (Thème) — 🟡 non re-testé visuellement après le fix |

---

## Onglet 2 (suite) — Composants → Boutons et Interactions

| Contrôle | Clé config | Composant(s) POS impacté(s) | Avant fix | Après fix |
|---|---|---|---|---|
| **Style des boutons** | `components.buttons.style` (default/rounded/pill/square/outline/ghost) | *Aucun* — variable `--pos-button-border-radius` calculée mais consommée par aucune règle CSS | ❌ Mort à 100% | ✅ **Vérifié visuellement** (pill et outline testés) — nouvel attribut `data-btn-style` sur la racine `.pos-preview` (`POSPreview.jsx`) + règles CSS ciblant `[data-slot="button"]` (tous les boutons shadcn, toutes pages confondues) dans `POSContent.jsx` |
| **Taille des boutons** | `components.buttons.size` (small→xl) | *Aucun* — variables `--pos-button-px/py/fs` calculées, jamais consommées | ❌ Mort à 100% | 🟡 Implémenté via les mêmes variables CSS maintenant consommées par `[data-slot="button"]`, mais **non re-testé visuellement** (harnais de test figé sur "medium") |
| **Effets au survol** | `components.buttons.hoverEffects` (bool) | *Aucun* | ❌ Mort à 100% | 🟡 Implémenté (`--pos-button-hover` → `opacity` au `:hover`), **non re-testé** (nécessite une interaction souris réelle) |

---

## Onglet 3 — Grille

| Contrôle | Clé config | Composant(s) POS impacté(s) | Avant fix | Après fix |
|---|---|---|---|---|
| **Colonnes par défaut** | `components.grid.columns` (2–6) | La règle CSS `.pos-preview-grid` existait dans `POSContent.jsx` mais **cette classe n'était appliquée à aucun élément, nulle part** dans les ~28 pages modules. Les grilles réelles (`POSProducts`, `POSDashboard`, etc.) utilisent des classes Tailwind fixes (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) sans lien avec la config | ❌ Mort à 100% | ✅ **Vérifié visuellement** (2 colonnes forcées même en grand écran) — classe `pos-preview-grid` ajoutée à `POSProducts.jsx` (grille produits) et `POSDashboard.jsx` (ligne de 6 cartes KPI), règle CSS passée en `!important` pour gagner sur les breakpoints Tailwind codés en dur |
| **Espacement entre éléments** | `components.grid.gap` | Idem (même classe, même portée) | ❌ Mort à 100% | ⚠️ **Corrigé sur les 2 mêmes pages seulement** (Produits, Dashboard) — 🟡 colonnes re-testées, gap non re-testé spécifiquement. Toutes les autres pages avec une grille codée en dur restent non affectées (hors périmètre de cette passe, cf. Limites) |

---

## Onglet 4 — Formulaires

| Contrôle | Clé config | Composant(s) POS impacté(s) | Avant fix | Après fix |
|---|---|---|---|---|
| **Style des champs** | `components.forms.inputStyle` (default/rounded/underlined/filled/outlined) | *Aucun* — variable `--pos-input-border-radius` calculée, jamais consommée | ❌ Mort à 100% | 🟡 Implémenté — attribut `data-input-style` sur `.pos-preview` + règles CSS sur `[data-slot="input"]`/`[data-slot="select-trigger"]`. Testé une fois (`filled`) mais différence visuelle **peu perceptible** dans la capture (la couleur `--muted` est un gris très clair par nature, pas un bug) |
| **Taille des champs** | `components.forms.inputSize` (small/medium/large) | *Aucun* | ❌ Mort à 100% | 🟡 Implémenté (mêmes variables `--pos-input-px/py/fs`), **non re-testé** |
| **Surbrillance au focus** | `components.forms.focusRing` (bool) | *Aucun* | ❌ Mort à 100% | 🟡 Implémenté (`outline: var(--pos-input-focus-ring)` au `:focus`), **non testé** (nécessite un focus clavier/souris réel) |

---

## Résumé visuel rapide

| Statut | Signification | Nombre de contrôles |
|---|---|---|
| ✅ Déjà fonctionnel, inchangé | Position navigation, Navigation rétractable | 2 |
| ✅ Corrigé et vérifié par capture d'écran | Espacement global, Largeur max, Arrondi cartes, Style boutons, Colonnes grille | 5 |
| ⚠️ Toujours partiel par conception | Mode compact (effet limité), Espacement grille (2 pages seulement) | 2 |
| 🟡 Corrigé (même mécanisme que ✅) mais non re-testé individuellement | Padding cartes, Style ombre, Taille boutons, Effets survol, Style/taille/focus champs | 7 |

---

## Limites de cet audit

- **Mode compact** n'a pas été étendu — il ne change toujours qu'un seul padding de page, pas la densité globale que son libellé laisse penser.
- **Grille (colonnes/espacement)** n'a été câblée que sur `POSProducts.jsx` et `POSDashboard.jsx` (les 2 grilles les plus visibles), pas sur l'ensemble des ~28 pages modules — décision de portée explicite du plan de correction, pas un oubli.
- L'approche technique pour Boutons/Formulaires (attributs `data-*` + CSS ciblant les `data-slot` de shadcn) est une **approximation visuelle**, pas un remplacement exact des classes internes de shadcn (`class-variance-authority`) — le rendu est proche mais pas garanti pixel-perfect pour chaque variante.
- Les éléments marqués 🟡 utilisent le même mécanisme déjà prouvé fonctionnel (variables CSS déjà calculées, désormais consommées par des règles CSS ciblant les bons sélecteurs `data-slot`) mais n'ont pas chacun fait l'objet d'une capture d'écran dédiée après correction.

## Fichiers modifiés (pour référence)

- `admin/src/config/POSConfiguration.js`
- `admin/src/components/pos/preview/POSPreview.jsx`
- `admin/src/components/pos/preview/POSContent.jsx`
- `admin/src/components/pos/preview/modules/POSProducts.jsx`
- `admin/src/components/pos/preview/modules/POSDashboard.jsx`
- `admin/src/components/customizer/ThemeSelector.jsx` *(synchronisation du rayon de bordure avec le Thème)*
- `admin/src/components/customizer/ColorPaletteEditor.jsx` *(hors périmètre Layout — correction faite lors de l'audit Thème)*
