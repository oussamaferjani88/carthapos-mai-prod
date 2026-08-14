# BI Wizard — Modèle dimensionnel & Rapport de validation

Rapport sur les modifications apportées aux étapes 6 (modèle dimensionnel) et 2 (validation) du wizard BI, ainsi que sur la remise en état de l'environnement de dev.

## 1. Objectif

Transformer l'étape 6 « Modèle dimensionnel » du wizard en un outil de modélisation BI professionnel (façon SSAS / Model View de Power BI / SSDT), strictement **lecture seule** : cardinalité des relations, colonnes de jointure, données d'échantillonnage par table, métriques star-schema, grain des faits, rôles de colonnes séparés, inspecteur de relation, export PNG/SVG/PDF, zoom/pan.

Parallèlement, refondre le rapport de validation (étape 2) pour que les jeux de données **optionnels manquants** apparaissent en INFO « Non exporté » et non en erreur « File not found ».

## 2. Contexte technique

- L'étape 6 ne modifie ni l'ETL, ni l'entrepôt, ni l'aperçu : couche de visualisation pure.
- La connaissance du modèle backend reste dans **un seul fichier** : `backend/services/bi-model-registry.js` (rôles, lignage, relations, `grain` par fait). Les comptages et la santé des clés viennent des données d'entrepôt (`preview.warehouse.dimensions/facts`).
- `bi-schema-registry.js` reflète le `BiDatasetRegistry` côté POS.
- L'aperçu des données réutilise l'endpoint existant `GET /bi-uploads/:id/transformation-preview?section=dimensions|facts&table=<name>`.
- L'export PDF est fait main (zéro dépendance : pas de jspdf/html2canvas).

## 3. Modifications backend

### 3.1 `backend/services/bi-model-registry.js`
- `grain` ajouté à chaque fait, en français :
  - `FactSale` : « Une ligne par vente »
  - `FactSaleItem` : « Une ligne par produit vendu dans une vente »
  - `FactInventory` : « Une ligne par instantané de produit »
  - `FactAppointment` : « Une ligne par rendez-vous »
  - `FactKitchenOrder` : « Une ligne par commande cuisine »
  - `FactKitchenOrderItem` : « Une ligne par ligne d'une commande cuisine »
- Chaque relation porte `cardinality:'1:N'`.
- Le modèle renvoyé inclut `warehouseType:'Star Schema'`.
- Les entrées `fkHealth` incluent `sampleMatched`/`sampleOrphans` (jusqu'à 5 valeurs de clé uniques chacune).

### 3.2 `backend/services/bi-schema-registry.js`
- `REQUIRED_DATASETS = ['sales','products','customers','inventory']`
- `OPTIONAL_DATASETS = ['tables','kitchen_orders','kitchen_order_items','suppliers','services','appointments','sale_items']`
- `DATASET_META` : module + businessTypes par jeu optionnel.
- `KNOWN_POS_DATASETS` : tous les jeux contractuels (dont `product_families`, `kitchen_departments`, `table_reservations`, `stock_movements`, `shifts`, `cash_drawer_events`, `audit_logs`, `vat_rates`, `z_reports`).

### 3.3 `backend/services/etl-pipeline.js` — refactor de `_validateDatasets`
- Application stricte des jeux requis.
- Itération sur `required + applicableOptional`.
- Jeu optionnel manquant → `{ status:'NOT_EXPORTED', rows:0, required:false, severity:'INFO', warnings:['Non exporté — jeu optionnel non requis pour ce business ou cet export'] }`.
- Chaque entrée reçoit `required` et `severity` (`OK`/`ERROR`/`WARN`/`INFO`).
- Fichier présent mais vide → `EMPTY`.
- Fichier hors `KNOWN_POS_DATASETS` → `UNEXPECTED` (severity WARN).
- `totalFiles`/`totalRows` de l'upload toujours dérivés de `result.datasets`.

### 3.4 `backend/routes/bi-uploads.js`
- Correction des valeurs `totalDatasets`/`totalRows` au niveau route sur `POST /:id/validate` et `GET /:id/validation-report` (désormais issues de `preview.validation`).

## 4. Modifications frontend (admin)

### 4.1 `admin/src/pages/wizard/StarSchema.jsx`
- Badge `1` côté dimension et `∞` côté fait sur chaque arête.
- Clic sur une arête → sélection de la relation.
- Molette : zoom centré sur le curseur (0,15×–3×).
- Glisser-déposer pour pan (depuis le fond ; boutons/nœuds/arêtes exclus).
- Boutons zoom in/out, fit-to-screen, reset, libellé `-/+ %`.
- Bouton **Export SVG/PNG/PDF** (via `model-export.js`).

### 4.2 `admin/src/lib/model-export.js`
- `relKeyOf`, `serializeSvg` (basé sur les attributs intrinsèques width/height du SVG), `exportSvg`, `exportPng`, `rasterizeSvg` (échelle 2), `exportPdf` (PDF maison, titre Helvetica, JPEG embarqué).

### 4.3 `admin/src/pages/wizard/Step6DimensionalModel.jsx`
- Tuiles métriques star-schema : Dimensions / Faits / Relations / Enregistrements / Type d'entrepôt / Santé des clés (%) / Clés orphelines.
- `RelationshipInspector` (panneau latéral) : source → destination, bloc de jointure (`fact.fk ↓ dim.pk`), cardinalité, santé %, barre de progression, stats lignes/appariées/orphelines, `SampleChips` (valeurs appariées + orphelines), boutons d'aperçu.
- Bouton `Preview Records` sur chaque carte dimension/fait → `SampleDataDialog` (20 premières lignes).
- `grain` par carte (icône Layers).
- Colonnes séparées en groupes : Clés étrangères (chaque ligne → dimension + badge `1:N`) / Mesures / Clés métier / Attributs.
- Lignes de santé FK cliquables → sélection d'une relation (surbrillance `bg-cyan-50`), colonne Cardinalité ajoutée.
- Lignage inchangé.

### 4.4 `admin/src/pages/wizard/Step2Validation.jsx`
- État `LOADING` géré (aucune étape ne passe encore `loading`/`onNext`).
- Bandes de contexte Passed/Failed.
- Tuiles : Requis `ok/total` / Optionnels non exportés (noms) / Jeux de données total.
- Sections Jeux de données requis + optionnels.
- `DatasetRow` : icône, nom, badge requis/optionnel, badge statut (Non exporté / Fichier vide / Inattendu / Invalide), badge sévérité ERROR/WARN/INFO, gris `bg-slate-100 text-slate-500` pour NOT_EXPORTED, badge `X lignes`, lignes de description (INFO/UNEXPECTED/EMPTY), erreurs/avertissements.
- Bouton Continuer activé uniquement si tout est passé.

## 5. Vérifications

### 5.1 Statique
- `npx eslint` : 0 erreur, 0 warning.
- `npx vite build` : OK sur les étapes 2 et 6.

### 5.2 Backend (test réel sur ZIP)
- `node --check` propre sur `etl-pipeline.js` et `bi-schema-registry.js`.
- ZIP réel (restaurant, id `cmsd3q4iq…`) : exactement `sales/products/customers/inventory/tables/kitchen_orders/kitchen_order_items/sale_items`, tous OK, aucun bruit UNEXPECTED.
- Simulation de `kitchen_order_items.csv` manquant → statut `NOT_EXPORTED` avec `severity:'INFO'` et warning « Non exporté ».

### 5.3 End-to-end (API live, backend port 3001)
- `POST /validate` sur `cmsd6rcyt…` → 4 requis `required:true`, 4 optionnels `required:false`, tous OK, 0 bloquant.
- `GET /validation-report` → même forme.
- `POST /prepare` → entrepôt régénéré.
- `GET /dimensional-model` → `Star Schema`, 6 faits (grain FR), 8 relations, `fkHealth` avec `health` + `sampleMatched`/`sampleOrphans`.
- `GET /transformation-preview` : `section=facts` (FactSaleItem) et `section=dimensions` (DimProduct) → données OK.

## 6. Remise en état de l'environnement de dev

Des processus backend redondants (`npm run dev`/nodemon) se disputaient le port 3001 (EADDRINUSE, « clean exit - waiting for changes before restart »). Actions :
- Arrêt de **tous** les processus node (y compris le vite admin, tué accidentellement lors du nettoyage).
- Redémarrage d'exactement **une** instance backend (3001) et **une** instance admin vite (5173).
- Logs : `backend-dev.log` / `admin-dev.log` dans `/tmp` (côté bash). Nodemon surveille désormais `services\**\*`.

## 7. État actuel & prochaines étapes

### Fait
- Étape 6 : modèle dimensionnel lisible (cardinalité 1/∞, jointures, grain, aperçu données, inspecteur, export PNG/SVG/PDF, zoom/pan), lecture seule.
- Étape 2 : optionnels manquants en INFO « Non exporté », jeux désactivés masqués, fichiers inattendus signalés, résumé Requis / Optionnels / Global.

### En attente
- Câblage des props `validating` + `onNext` dans Step2Validation (volontairement laissé pour la suite) — contrôle manuel navigateur des étapes 2 et 6 conseillé avant de clore le wizard.
- Test navigateur manuel du zoom/pan/export et du rendu des jeux optionnels (noter que `tables`/`kitchen_orders` affichent de vrais avertissements de type).

## 8. Fichiers concernés

- `backend/services/bi-model-registry.js` — métadonnées modèle lecture seule.
- `backend/services/bi-schema-registry.js` — registre des jeux requis/optionnels/connus.
- `backend/services/etl-pipeline.js` — `_validateDatasets` refactoré.
- `backend/routes/bi-uploads.js` — validate / validation-report / dimensional-model / transformation-preview.
- `admin/src/pages/wizard/Step2Validation.jsx` — rapport de validation.
- `admin/src/pages/wizard/Step6DimensionalModel.jsx` — page modèle dimensionnel.
- `admin/src/pages/wizard/StarSchema.jsx` — diagramme (zoom/pan/export, cardinalité 1/∞).
- `admin/src/lib/model-export.js` — export PNG/SVG/PDF.
