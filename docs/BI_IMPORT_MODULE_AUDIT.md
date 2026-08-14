# Audit & Documentation — Module « Import BI »

> **Scope** : Audit documentation complet (lecture seule) du module d'import BI de la plateforme CarthaPOS.
> **Périmètre** : `admin/src/pages/BiWizard.jsx` + `admin/src/pages/wizard/*` (front), `backend/routes/bi-uploads.js`, `backend/routes/bi-dashboards.js` et `backend/services/*` (back), schéma d'entrepôt Prisma.
> **Aucun code n'a été modifié.**

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Architecture générale](#2-architecture-générale)
3. [Étape 1 — Upload (ZIP BI)](#3-étape-1--upload-zip-bi)
4. [Étape 2 — Rapport de validation](#4-étape-2--rapport-de-validation)
5. [Étape 3 — Aperçu des données brutes](#5-étape-3--aperçu-des-données-brutes)
6. [Étape 4 — Préparation des données](#6-étape-4--préparation-des-données)
7. [Étape 5 — Aperçu avant / après](#7-étape-5--aperçu-avant--après)
8. [Étape 6 — Modèle dimensionnel (schéma en étoile)](#8-étape-6--modèle-dimensionnel-schéma-en-étoile)
9. [Étape 7 — Revue et corrections](#9-étape-7--revue-et-corrections)
10. [Étape 8 — Chargement dans l'entrepôt](#10-étape-8--chargement-dans-lentrepôt)
11. [Étape 9 — Tableaux de bord](#11-étape-9--tableaux-de-bord)
12. [Étape 10 — Rapport final](#12-étape-10--rapport-final)
13. [Flux ETL de bout en bout](#13-flux-etl-de-bout-en-bout)
14. [Schéma de l'entrepôt de données](#14-schéma-de-lentrepôt-de-données)
15. [Valeur métier par écran](#15-valeur-métier-par-écran)
16. [Évaluation finale (forces, limites, améliorations)](#16-évaluation-finale-forces-limites-améliorations)

---

## 1. Vue d'ensemble

Le module **Import BI** est un assistant guidé (wizard) en 10 étapes qui permet à un administrateur
d'importer un export ZIP provenant d'un poste de caisse CarthaPOS (POS), de le **valider**,
de le **préparer/nettoyer**, de **corriger** les erreurs, de **charger** les données dans un
**entrepôt de données en étoile**, puis de **générer** un tableau de bord et un **rapport final**.

```
POS (CarthaPOS) ──export──▶ ZIP (CSV + metadata.json) ──▶ Admin Import BI Wizard ──▶ Entrepôt BI (star schema) ──▶ Tableau de bord Metabase
```

### Contrat d'échange

- **Format** : `.zip` contenant plusieurs fichiers `.csv` (un par jeu de données) + `metadata.json`.
- **Version de schéma** : `BI_SCHEMA_VERSION = "2.2.0"` (défini côté serveur dans `bi-schema-registry.js`,
  miroir du contrat côté POS `BiSchemaContract.cjs`). Une incohérence de version bloque la validation.
- **Limite de taille** : 100 Mo (multer), extension `.zip` uniquement.
- **Jeux de données requis** : `sales`, `products`, `customers`, `inventory`.
- **Jeux de données optionnels** : `tables`, `kitchen_orders`, `kitchen_order_items`, `suppliers`,
  `services`, `appointments`, `sale_items` — leur présence dépend du type de business et des modules activés.
- **Langue de l'interface** : français.

### Statuts du cycle de vie d'un upload

`UPLOADED` → `PENDING_PAYMENT_VERIFICATION` → `VALIDATING` → `VALIDATED` → `PREPARED` →
`PROCESSING`/`COMPLETED` → `FAILED` (tout point d'échec). L'upload est `COMPLETED` après le
chargement réussi dans l'entrepôt ; le tableau de bord n'est générable que sur un upload `COMPLETED`.

---

## 2. Architecture générale

### Frontend (React + Vite + Tailwind v4 + shadcn/ui)

| Fichier | Rôle |
|---|---|
| `admin/src/pages/BiWizard.jsx` | Orchestrateur : stepper 10 étapes, état partagé `wizardData`, navigation `Retour`/`Suivant`. |
| `admin/src/pages/wizard/Step1Upload.jsx` | Upload du ZIP + sélection client / type de business. |
| `admin/src/pages/wizard/Step2Validation.jsx` | Rapport de validation (jeux requis/optionnels). |
| `admin/src/pages/wizard/Step3RawPreview.jsx` | Aperçu des données brutes (onglets par jeu). |
| `admin/src/pages/wizard/Step4Preparation.jsx` | Lance la préparation et affiche les statistiques. |
| `admin/src/pages/wizard/Step5TransformationPreview.jsx` | Aperçu avant/après : corrections auto, comptoir, réconciliation. |
| `admin/src/pages/wizard/Step6DimensionalModel.jsx` | Modèle en étoile : diagramme, fiches, intégrité, lignage, exports. |
| `admin/src/pages/wizard/StarSchema.jsx` | Rendu SVG du diagramme en étoile. |
| `admin/src/pages/wizard/ModelExplorer.jsx` | Arborescence Entrepôt / Dimensions / Faits (colonne latérale). |
| `admin/src/pages/wizard/WarehouseInspector.jsx` | Inspecteur de relation : aperçu, jointure, SQL généré. |
| `admin/src/pages/wizard/Step6Corrections.jsx` | Revue et correction des erreurs bloquantes. |
| `admin/src/pages/wizard/Step7LoadConfirm.jsx` | Confirmation du chargement (action irréversible). |
| `admin/src/pages/wizard/Step8Dashboard.jsx` | Génération / liste des tableaux de bord. |
| `admin/src/pages/wizard/Step9Success.jsx` | Rapport final. |
| `admin/src/lib/model-export.js` | Export diagramme PNG/SVG/PDF + rapports PDF (relations, lignage). |
| `admin/src/lib/bi-model-utils.js` | Helpers lecture seule : santé des relations, colonnes de jointure, génération SQL. |
| `admin/src/lib/api.js` | Client HTTP (axios) partagé. |

### Backend (Express + Prisma)

| Fichier | Rôle |
|---|---|
| `backend/routes/bi-uploads.js` | Endpoints upload + tout le cycle du wizard (validate, prepare, correct, confirm-load, report…). |
| `backend/routes/bi-dashboards.js` | CRUD tableaux de bord, génération depuis upload, lien/embed Metabase. |
| `backend/services/etl-pipeline.js` | Pipeline ETL : extraction ZIP, lecture metadata, validation, préparation, chargement entrepôt, corrections. |
| `backend/services/bi-schema-registry.js` | Contrat de schéma serveur : colonnes attendues, types, jeux requis/optionnels, applicabilité. |
| `backend/services/bi-data-utils.js` | Parseurs partagés (nombre, entier, date, table, enums) — source unique de vérité. |
| `backend/services/data-preparation-service.js` | Moteur de nettoyage : règles par jeu, normalisation, dédoublonnage, réconciliation. |
| `backend/services/bi-model-registry.js` | Métadonnées lecture seule du modèle dimensionnel (rôles, sources, relations, FK health). |
| `backend/services/warehouse-service.js` | Requêtes analytiques pré-calculées (tenant-isolées) pour dashboards. |
| `backend/services/analytics-cache-service.js` | Cache JSON d'enrichissement (données granulaires absentes de l'entrepôt), lecture ZIP seule. |
| `backend/services/bi-insight-generator.js` | Génération d'« insights » texte (recommandations métier). |
| `backend/prisma/schema.prisma` | Modèle : `BiUpload`, `BiUploadFile`, `BiProcessingJob`, `BiProcessingLog`, `BiRequest`, `BiAnalysisRequest`, `BiDashboard`, `BiDashboardTemplate`, `BiNotification` + tables d'entrepôt `Dim*` / `Fact*`. |

### Fichiers de travail intermédiaires (côté serveur)

- **ZIP** : stocké dans `backend/uploads/bi-zips/` (nommé `{timestamp}_{safeName}.zip`).
- **Preview JSON** : `backend/uploads/bi-previews/{uploadId}.json` — contient raw/cleaned datasets,
  warehouse en mémoire, corrections persistées. Supprimé après `confirm-load`.
- **Cache d'enrichissement** : `backend/analytics-cache/{uploadId}.json` + `meta.json` (clientId → uploadId courant).

---

## 3. Étape 1 — Upload (ZIP BI)

### Purpose
Récupérer un export ZIP du POS, l'attacher au bon client (tenant) et initier la transaction BI.

### Business explanation
L'administrateur importe le fichier produit par le poste de caisse du client. C'est le point d'entrée
unique du parcours d'import ; sans upload, aucune étape suivante n'est possible. L'upload est lié à un
client (locataire) et à un type de business (restaurant, retail, salon…) qui conditionnent le reste du parcours.

### Technical explanation
- Multer `diskStorage` → `backend/uploads/bi-zips`, nom = `{Date.now()}_{sanitizedOriginalName}`.
- Filtre : `.zip` uniquement ; limite 100 Mo (`LIMIT_FILE_SIZE` → HTTP 400).
- Hachage **SHA-256** du fichier pour détection de doublons (`BiUpload.fileHash` unique).
- Tenant validation : le `clientId` doit exister dans `Client` ; un `requestId` optionnel doit référencer
  une `BiRequest` au statut `APPROVED`.
- Création du `BiUpload` au statut `PENDING_PAYMENT_VERIFICATION`.

### User Actions
1. Glisser-déposer (ou parcourir) un fichier `.zip`.
2. Choisir le **Client** (liste `GET /bi-uploads/clients/list`).
3. Choisir le **Type d'entreprise** (liste fixe : retail, restaurant, cafe, bakery, pharmacy, salon, hotel, clinic).
4. Cliquer **Importer le ZIP** (barre de progression).

### Backend Process
`POST /api/bi-uploads` (multer → validation client/request → SHA-256 → détection doublon →
création `BiUpload` → 201).

### Input
`file` (ZIP, ≤ 100 Mo), `clientId`, `businessType` (multipart/form-data).

### Output
`BiUpload` créé (id, clientId, businessType, fileName, fileSize, status, createdAt) — réponse 201.

### Warehouse Impact
Aucun (pas encore d'écriture entrepôt).

### Why important
Garantit que chaque import est attribué au bon locataire (isolation tenant), que les fichiers sont
uniques (anti-doublon), et qu'un business type correct déclenche le bon pipeline de validation.

### Dependencies
`Client` (existence), éventuellement `BiRequest` (statut `APPROVED`), multer.

### Possible errors
- `Only .zip files are allowed` (mauvaise extension).
- `File too large. Maximum size is 100 MB.`
- `Unknown clientId ... No Client record found.`
- `Duplicate upload — this file has already been uploaded` (HTTP 409, si l'ancien n'est pas en échec).
- `Cannot link upload to a request with status ...` (request non approuvée).

### Related services/files
`routes/bi-uploads.js`, `Step1Upload.jsx`, `prisma.schema.prisma` (`BiUpload`).

---

## 4. Étape 2 — Rapport de validation

### Purpose
Vérifier que l'archive respecte le contrat de schéma BI (présence, colonnes, types) avant toute analyse.

### Business explanation
L'export POS doit correspondre exactement au schéma attendu. Cette étape donne un rapport lisible
(« requis » vs « optionnel », lignes, doublons, erreurs de type) qui évite de charger des données
invalides dans l'entrepôt. Les jeux optionnels absents ne sont **pas** des erreurs s'ils ne
s'appliquent pas au business configuré.

### Technical explanation
`etlPipeline.extractAndValidate()` :
1. Extraction ZIP (via `unzip -o` en subprocess, fallback `adm-zip`).
2. Lecture de `metadata.json` → `clientId`, `businessName`, `businessType`, `biSchemaVersion`, `enabledModules`, `exportTimestamp`.
3. Vérification stricte `biSchemaVersion === "2.2.0"` (sinon erreur bloquante).
4. `_validateDatasets()` : présence des jeux requis (erreur si manquant), applicabilité des optionnels
   (`isDatasetApplicable(businessType, enabledModules)`), validation des en-têtes
   (`validateCsvColumns`), validation des types par ligne (`validateCsvTypes`), détection de doublons.
5. Statuts par jeu : `OK`, `NOT_EXPORTED`, `EMPTY`, `SKIPPED`, `UNEXPECTED`.
6. Le résultat est persisté dans le preview JSON ; `BiUpload` passe à `VALIDATED`.

Note : le `clientId` de l'entrepôt est **toujours** celui sélectionné à l'upload (isolation tenant),
jamais celui embarqué dans le ZIP.

### User Actions
L'écran se charge automatiquement : il déclenche `POST /validate` puis `GET /validation-report` et
affiche le rapport. L'utilisateur lit l'état global (Passée / Échouée) et les jeux de données.

### Backend Process
`POST /api/bi-uploads/:id/validate` → `extractAndValidate()` → met à jour `BiUpload` (status `VALIDATED`,
`totalFiles`, `totalRows`) → sauvegarde preview. Puis `GET /:id/validation-report` relit le preview.

### Input
Upload `:id` + fichier ZIP stocké sur disque.

### Output
`validation` (par jeu : status, rows, required, severity, duplicateRows, errors, warnings) + `metadata`.

### Warehouse Impact
Aucun.

### Why important
Filtre en amont les archives mal formées, garantit la compatibilité de version de schéma, et empêche
de démarrer une préparation sur des données non conformes.

### Dependencies
`bi-schema-registry` (SCHEMAS, REQUIRED/OPTIONAL_DATASETS, DATASET_META), `bi-data-utils` (parseurs).

### Possible errors
- `metadata.json not found in ZIP archive`
- `BI Schema version mismatch: export vX ≠ server v2.2.0`
- `Required dataset "sales.csv" not found in ZIP`
- `Validation failed for required dataset ...: Missing required column ...`
- `Type validation failed for ... (N error(s))`

### Related services/files
`Step2Validation.jsx`, `etl-pipeline.js`, `bi-schema-registry.js`, `bi-data-utils.js`.

---

## 5. Étape 3 — Aperçu des données brutes

### Purpose
Visualiser les données **telles qu'elles arrivent** dans le ZIP (aucune transformation) avant de lancer la préparation.

### Business explanation
Étape de transparence : l'administrateur voit les lignes brutes par jeu de données (50 premières lignes,
nombre total, colonnes), ce qui permet un premier contrôle visuel avant nettoyage.

### Technical explanation
`GET /api/bi-uploads/:id/raw-preview` :
- Sans paramètre : résumé de tous les jeux (colonnes, nb de lignes).
- Avec `?dataset=key&page&pageSize` : pagination des lignes brutes depuis `preview.rawDatasets`.

### User Actions
Naviguer entre les onglets de jeux de données (sales, products, customers, inventory, …) et inspecter
les échantillons.

### Backend Process
Lecture du preview JSON (issu de l'étape validation) → pagination → réponse JSON.

### Input
`preview.rawDatasets` (déjà en mémoire sur disque depuis l'étape 2).

### Output
Pour chaque jeu : `header`, `rows` (page), `totalRows`, `page`, `pageSize`, `totalPages`.

### Warehouse Impact
Aucun.

### Why important
Sert de référence « avant » pour l'étape 5 et de base de contrôle pour détecter les anomalies évidentes
au plus tôt.

### Dependencies
Étape 2 terminée (preview présent).

### Possible errors
`No raw data available. Run validate first.` — `Dataset "x" not found`.

### Related services/files
`Step3RawPreview.jsx`, `routes/bi-uploads.js`.

---

## 6. Étape 4 — Préparation des données

### Purpose
Transformer les données brutes en données propres, typées et prêtes pour l'entrepôt, en appliquant
automatiquement les corrections sûres et en signalant les problèmes nécessitant une décision humaine.

### Business explanation
C'est le moteur de nettoyage : normalisation des textes, conversion des nombres/dates, normalisation
des valeurs catégorielles (p. ex. « espèces » → `cash`), retrait des doublons, détection des commandes
comptoir, et **réconciliation** des ventes (somme des lignes vs total des ventes). Tout ce qui est sûr
est corrigé automatiquement ; tout ce qui est douteux est marqué `WARN`/`ERROR` pour revue.

### Technical explanation
`POST /api/bi-uploads/:id/prepare` → `etlPipeline.prepareWarehouse()` :
1. `dataPreparationService.prepare()` sur tous les jeux (même pipeline unique que l'ETL historique).
2. Règles par jeu dans `DATASET_RULES` (required/integer/numeric/date/text/categorical/enums,
   `optionalDefaults`, `unknownDefaults`, `businessKey`, `checks`).
3. Typage strict via les parseurs de `bi-data-utils` (nombre réel / entier / date ISO / `parseTableNumber`).
4. Changements émis sous forme d'objets `{ dataset, rowIndex, column, originalValue, preparedValue, action, code, reason, severity }`.
   Codes : `AUTO_FIXED`, `AUTO_EXTRACTED_NUMBER`, `DUPLICATE_REMOVED`, `COUNTER_ORDER`,
   `MISSING_REQUIRED_*`, `INVALID_NUMBER_*`, `INVALID_DATE_*`, `UNKNOWN_CATEGORICAL_VALUE`,
   `DUPLICATE_BUSINESS_KEY`, `NEGATIVE_TOTAL/STOCK/PRICE`, `INVALID_QUANTITY`,
   `RECONCILIATION_LINE_TOTAL`, `RECONCILIATION_SALE_TOTAL`, `RECONCILIATION_GLOBAL`, `RECONCILIATION_GRAIN`.
5. Réconciliation croisée `sales` ↔ `sale_items` (tolérance absolue 0,01 et relative 0,5 %).
6. Construction en mémoire du warehouse : dimensions (`DimTime`, `DimClient`, `DimCustomer`,
   `DimProduct`, `DimSupplier`) et faits (`FactSale`, `FactInventory`, `FactAppointment`,
   `FactKitchenOrder`, `FactSaleItem`, `FactKitchenOrderItem`) — miroir exact de ce qui sera chargé.
7. Statistiques : `totalRowsProcessed`, `automaticFixes`, `warnings`, `errors`, `duplicatesRemoved`.
8. Statut global : `READY_FOR_REVIEW` (0 erreur) ou `NEEDS_CORRECTION`.

### User Actions
Cliquer **Lancer la préparation**, puis lire les statistiques (lignes traitées, corrections auto,
avertissements, erreurs, doublons retirés) et l'état « Prêt pour revue » / « Revue requise ».

### Backend Process
`prepareWarehouse()` → persiste `cleanedDatasets`, `warehouse`, `statistics`, `changes`, `profiles`,
`preparationStatus` dans le preview → `BiUpload` passe à `PREPARED`.

### Input
`preview.rawDatasets` + `preview.metadata`.

### Output
Résumé (nb de lignes par dim/fact), `statistics`, `status`, `changesCount`, `unresolvedErrors`.

### Warehouse Impact
Aucune écriture en base ; le warehouse est construit **en mémoire** (prévisualisation exacte du chargement).

### Why important
C'est le cœur de la qualité des données : tout ce qui arrivera dans l'entrepôt passe par ce nettoyage,
et les écarts de réconciliation sont détectés avant toute écriture.

### Dependencies
`data-preparation-service` (DATASET_RULES), `bi-data-utils` (parseurs), `etl-pipeline` (`_buildWarehouse`).

### Possible errors
- `No raw data. Run validate first.` (ordre des étapes)
- Erreurs `ERROR` non résolues → l'étape 8 bloquera le chargement.

### Related services/files
`Step4Preparation.jsx`, `data-preparation-service.js`, `bi-data-utils.js`, `etl-pipeline.js`.

---

## 7. Étape 5 — Aperçu avant / après

### Purpose
Présenter de manière lisible **tout ce que la préparation a changé**, groupé par type de transformation,
avec comparaison avant/après et réconciliation des ventes.

### Business explanation
L'administrateur voit, en un coup d'œil : corrections automatiques (ex. `"12,5"` → `12.5`,
`"T7"` → `7`), commandes comptoir (table NULL), avertissements et erreurs. Un bloc de **réconciliation**
compare le grain des ventes (sum line_total + vat − discounts vs total des ventes) pour garantir que les
chiffres racontent la même histoire.

### Technical explanation
`GET /api/bi-uploads/:id/transformation-preview` :
- Sans paramètre : résumé (raw/cleaned/dimensions/facts par jeu + statistics + changes + preparationStatus).
- Avec `?section&table&page&pageSize` : lignes paginées de la section choisie (`raw`, `cleaned`, `dimensions`, `facts`).

Le composant regroupe les `changes` par clé (dataset|column|code|avant|après), isole les
`COUNTER_ORDER`, `RECONCILIATION_GRAIN` / `RECONCILIATION_GLOBAL`, et trie par volume.

### User Actions
Lire les sections « Corrections automatiques & normalisations », « Commandes non liées à une table »,
« Réconciliation des ventes », « Avertissements », « Erreurs », et parcourir les onglets des données préparées.

### Backend Process
Lecture du preview JSON (issu de l'étape 4) → pagination / regroupement → réponse.

### Input
`preview.cleanedDatasets`, `preview.warehouse`, `preview.statistics`, `preview.changes`.

### Output
`data` (résumé ou lignes paginées), `statistics`, `changes`, `preparationStatus`, `wizardStep`.

### Warehouse Impact
Aucun.

### Why important
Assure la **traçabilité** des transformations : l'utilisateur sait exactement ce qui sera chargé et peut
déceler une réconciliation incohérente avant validation.

### Dependencies
Étape 4 terminée.

### Possible errors
`Warehouse not prepared. Run prepare first.` — `Table "x" not found in section "y"`.

### Related services/files
`Step5TransformationPreview.jsx`, `routes/bi-uploads.js`.

---

## 8. Étape 6 — Modèle dimensionnel (schéma en étoile)

### Purpose
Visualiser, auditer et exporter le modèle sémantique en étoile (SSAS / Power BI Model View) issu de
l'import — en **lecture seule** (aucune modification des données, de l'ETL ni de l'entrepôt).

### Business explanation
Cette étape répond à la question « que vais-je pouvoir analyser ? ». Elle montre les tables de dimensions
et de faits, leurs relations 1:N, l'**intégrité référentielle** (FK health), et la **traçabilité**
colonne CSV → colonne entrepôt. L'administrateur peut vérifier que les jointures tiennent (pas d'orphelins)
avant de charger.

### Technical explanation
`GET /api/bi-uploads/:id/dimensional-model` → `buildDimensionalModel(preview.warehouse)` (`bi-model-registry.js`) :
- Métadonnées statiques par table : rôles de colonnes (`primary_key`, `business_key`, `foreign_key`,
  `measure`, `attribute`), `grain`, `sourceDataset`, relations `1:N`, `pk`.
- **FK health** calculé pour chaque relation : `matched`, `orphan`, `noKey`, `health %`.
- UI : diagramme SVG (`StarSchema.jsx`), arborescence (`ModelExplorer.jsx`), fiches Dimensions/Faits,
  table d'intégrité référentielle, table de lignage, et **inspecteur de relation** (`WarehouseInspector.jsx`)
  qui montre un aperçu de jointure réel + **SQL généré** (`generateJoinSql`).
- Exports : diagramme PNG / SVG / PDF (`model-export.js`), rapports PDF « Relations » et « Lignage ».

### User Actions
1. Consulter les tuiles de synthèse (dims, faits, relations, mesures, attributs, santé moyenne, relations cassées).
2. Naviguer dans l'explorateur / le diagramme, cliquer une table ou une relation.
3. Lire l'inspecteur (aperçu, jointure, SQL copiable).
4. Rechercher / filtrer, exporter le diagramme ou les rapports.

### Backend Process
Lecture du preview (warehouse en mémoire) → construction du modèle dimensionnel + FK health → JSON.

### Input
`preview.warehouse` (dimensions + faits).

### Output
`{ dimensions[], facts[], relationships[], fkHealth[], warehouseType: "Star Schema" }`.

### Warehouse Impact
Aucun (métadonnées purement descriptives).

### Why important
Donne confiance dans la qualité de la modélisation avant chargement : un taux d'orphelins élevé ou des
FK cassées signalent un problème de données qu'il vaut mieux corriger maintenant qu'après l'import.

### Dependencies
Étape 4 (warehouse en mémoire), `bi-model-registry`, `bi-model-utils`, `model-export`, `StarSchema`,
`ModelExplorer`, `WarehouseInspector`.

### Possible errors
`Warehouse not prepared. Run prepare first.`

### Related services/files
`Step6DimensionalModel.jsx`, `StarSchema.jsx`, `ModelExplorer.jsx`, `WarehouseInspector.jsx`,
`bi-model-registry.js`, `bi-model-utils.js`, `model-export.js`.

> **Remarque d'audit (résolu)** : l'affichage de la colonne d'exploration à partir de 1280px était cassé
> par un conflit de cascade CSS entre l'output Tailwind non-layered de `src/index.css` et l'output
> layered de `src/App.css` (le `.hidden` non-layered écrasait `.xl\:block`). Corrigé dans
> `admin/src/index.css` en remplaçant `@tailwind base/components/utilities` par `@import "tailwindcss";`.
> Vérifié : la colonne explore (230px) et le board remplissent désormais la colonne `minmax(0,1fr)`.

---

## 9. Étape 7 — Revue et corrections

### Purpose
Résoudre les erreurs bloquantes (`ERROR`) détectées par la préparation avant de charger, soit en
corrigeant une valeur, soit en revoyant les données nettoyées/dimensions/faits.

### Business explanation
Certaines erreurs ne peuvent pas être auto-corrigées (valeur non numérique, date invalide, champ requis
vide). L'administrateur saisit la bonne valeur ; le système re-type et re-valide la correction, et toute
correction est **rejouée** au moment du chargement pour ne jamais être écrasée par une re-dérivation.

### Technical explanation
- `GET /transformation-preview` charge le résumé + les `changes` non résolus (`severity === 'ERROR' && !resolved`).
- `POST /api/bi-uploads/:id/correct` avec `{ section, table, rowIndex, changes }` :
  - Applique `Object.assign` sur la cible (cleaned / dimensions / facts).
  - Persiste l'overlay dans `preview.corrections[section][table][rowIndex]` (rejouable par `rowIndex` stable).
  - Marque les changements `ERROR` correspondants comme `resolved` avec `action = 'MANUALLY_CORRECTED'`.
- Au chargement, `_applyCleanedCorrections()` + `_replayOverlays()` re-typent et re-valident chaque
  correction ; une correction encore invalide devient un « unresolved issue » et la ligne est sautée.

### User Actions
1. Lire la liste des erreurs bloquantes (dataset[rown].col, code, origine → préparé, raison).
2. Saisir une valeur et cliquer **Corriger** (ou construire une liste de corrections champ/table/row/valeur + raison).
3. Basculer entre sections « Données nettoyées », « Dimensions », « Faits » pour corriger manuellement toute cellule.
4. **Appliquer les corrections** puis **Continuer**.

### Backend Process
`POST /:id/correct` → mise à jour preview + overlay + résolution des erreurs → réponse 200.

### Input
`section`, `table`, `rowIndex`, `changes` (objet colonne → valeur).

### Output
Confirmation `Correction applied`.

### Warehouse Impact
Aucun immédiat ; les corrections seront appliquées lors de `confirm-load`.

### Why important
C'est le contrôle qualité humain final : il empêche toute donnée invalide d'atteindre l'entrepôt et
documente la correction (raison).

### Dependencies
Étape 4/5 (changes), mécanisme d'overlay du preview, re-type au chargement.

### Possible errors
- `Target not found: section/table`
- `rowIndex out of range`
- Valeur corrigée encore invalide → `unresolvedIssues` + ligne sautée (noté au chargement).

### Related services/files
`Step6Corrections.jsx`, `routes/bi-uploads.js`, `etl-pipeline.js` (replay), `data-preparation-service.js`.

---

## 10. Étape 8 — Chargement dans l'entrepôt

### Purpose
Écrire définitivement les données préparées (avec corrections) dans les tables d'entrepôt — action
**irréversible** qui remplace le snapshot précédent du client.

### Business explanation
C'est le « go » final. L'administrateur confirme ; le serveur remplace les données de l'entrepôt du
client par le nouvel import (pas d'accumulation), puis marque l'upload `COMPLETED` pour permettre la
génération du tableau de bord. Toute erreur non résolue bloque le chargement (gate).

### Technical explanation
`POST /api/bi-uploads/:id/confirm-load` → `etlPipeline.loadIntoWarehouse()` :
1. **Gate** : blocage si des changements `ERROR` non résolus persistent sur les jeux chargés
   (`sales, sale_items, products, customers, inventory, appointments, kitchen_orders, kitchen_order_items`).
2. Replay des corrections (cleaned + overlays dims/faits) avec re-typage et validation.
3. Transaction unique (timeout 120 s) :
   - `BiProcessingJob` créé/mis à jour à `PROCESSING`.
   - `_loadDimensions` : DimTime (auto-seedé depuis toutes les dates), DimClient (upsert),
     DimCustomer / DimProduct / DimSupplier (upsert, IDs dérivés `cust_/prod_/supp_{client}_{id}`).
   - **Suppression du snapshot précédent** du tenant (`deleteMany` sur les 6 fact tables).
   - `_loadFacts` : FactSale, FactInventory, FactAppointment, FactKitchenOrder, FactSaleItem,
     FactKitchenOrderItem — insertion par lots de 1000 (`createMany`, `skipDuplicates`).
   - Contrôle d'intégrité référentielle : fact référençant un produit absent du jeu `products` = orphelin → sauté + warning.
   - `BiProcessingJob` → `COMPLETED` (recordsLoaded), `BiUpload` → `COMPLETED` (totalRows).
   - Logs `BiProcessingLog` tout au long (EXTRACT / LOAD / CANCELLED).
4. Nettoyage du preview JSON après succès.

### User Actions
1. Lire l'avertissement d'irréversibilité.
2. (Option) « Reportez-vous à l'étape suivante » (saut).
3. **Confirmer le chargement** → progression → succès (nb d'enregistrements, durée).
4. Si gate : retourner aux corrections.

### Backend Process
`POST /:id/confirm-load` → gate → `loadIntoWarehouse` → transaction → nettoyage preview → réponse.

### Input
`preview.cleanedDatasets`, `preview.warehouse`, `preview.changes`, `preview.corrections`, `preview.metadata`.

### Output
`recordsLoaded`, `elapsed`, `report` (`skippedRows`, `orphanWarnings`, `appliedCorrections`, `unresolvedIssues`).

### Warehouse Impact
**Majeur** : remplace tout le snapshot analytique du tenant (dimensions upsertées, faits vidés/rechargés).
C'est la seule étape qui écrit dans l'entrepôt.

### Why important
Point de bascule : garantit que seules des données validées entrent en entrepôt, que le tenant reste
isolé, et que l'état est tracé (`BiProcessingJob`, logs).

### Dependencies
Étape 4 (préparation), étapes 6/7 (corrections), transaction Prisma, `dimTime`/`dimClient`.

### Possible errors
- `Data requires review before loading (N unresolved error(s))` → HTTP 400 + `unresolvedErrors`.
- `No prepared data. Run prepare first.`
- Timeout de transaction (120 s) sur très gros imports.

### Related services/files
`Step7LoadConfirm.jsx`, `etl-pipeline.js`, `prisma.schema.prisma` (tables `Dim*`/`Fact*`).

---

## 11. Étape 9 — Tableaux de bord

### Purpose
Créer / lister le tableau de bord analytique associé à l'import terminé.

### Business explanation
Une fois les données en entrepôt, l'administrateur peut générer un tableau de bord à partir du modèle
Metabase du type de business, consulter les dashboards existants et ouvrir l'espace analyste.

### Technical explanation
`POST /api/bi/dashboards/generate-from-upload` :
- Requiert un upload `COMPLETED` ; une `BiRequest` liée (si présente) doit être `APPROVED`.
- Un dashboard existe déjà → HTTP 409 (idempotent).
- Cherche le template `BiDashboardTemplate` par `businessType` ; crée `BiDashboard` en `DRAFT`
  (nom/description issus du template sinon générés).
- Crée une notification admin `DASHBOARD_GENERATED`.

### User Actions
L'écran charge la liste (`GET /bi-uploads`) ; s'il n'y en a pas, il déclenche la génération automatique.
L'utilisateur peut ouvrir un dashboard, créer un tableau de bord manuellement (`/bi-dashboard/new`) ou continuer.

### Backend Process
`POST /bi/dashboards/generate-from-upload` → vérifications → création `BiDashboard` (+ template lookup) → notification.

### Input
`{ uploadId }`.

### Output
`BiDashboard` créé (id, status `DRAFT`, name, description) ou 409 si déjà généré.

### Warehouse Impact
Aucun (lecture des données via `warehouse-service`).

### Why important
Boucle la valeur métier : les données ne sont utiles que si elles sont consultables. Lie l'import au
template de dashboard adapté au secteur.

### Dependencies
Upload `COMPLETED`, `BiDashboardTemplate` (optionnel), `bi_uploads` liste.

### Possible errors
- `Upload status is "..." . Only COMPLETED uploads can generate dashboards.`
- `A dashboard has already been generated for this upload.` (409)
- `Linked BI request has status "..."` (si non approuvé).

### Related services/files
`Step8Dashboard.jsx`, `routes/bi-dashboards.js`, `warehouse-service.js`, `bi-insight-generator.js`.

---

## 12. Étape 10 — Rapport final

### Purpose
Clore l'import avec un récapitulatif (fichier source, lignes chargées, durée, statut, dashboard généré).

### Business explanation
Écran de confirmation terminal : l'utilisateur sait exactement ce qui a été importé et peut repartir
vers la liste des imports.

### Technical explanation
`GET /api/bi-uploads/:id/report` : charge `BiUpload` + `BiProcessingJob` (recordsLoaded, durées) +
premier dashboard lié ; calcule `elapsed` depuis les horodatages du job.

### User Actions
Lire le récapitulatif, cliquer **Télécharger le rapport** (bouton présent) ou **Retour aux imports**.

### Backend Process
`GET /:id/report` → agrégation upload + job + dashboard → JSON.

### Input
Upload `:id`.

### Output
`uploadId, fileName, fileSize, status, totalRows, recordsLoaded, elapsed, processingJob, dashboard, createdAt, completedAt`.

### Warehouse Impact
Aucun.

### Why important
Trace finale et validation utilisateur de la fin de parcours.

### Dependencies
Étapes précédentes réussies.

### Possible errors
`Upload not found` (404).

### Related services/files
`Step9Success.jsx`, `routes/bi-uploads.js`.

---

## 13. Flux ETL de bout en bout

```
POS (Electron)                        Backend (Node/Express + Prisma)
──────────────                        ────────────────────────────────
export ZIP                            POST /api/bi-uploads
  ├─ metadata.json                      ├─ multer (100 Mo, .zip)
  ├─ sales.csv            ───────────▶  ├─ SHA-256 (anti-doublon)
  ├─ products.csv                       ├─ validation tenant / request
  ├─ customers.csv                      └─ BiUpload PENDING_PAYMENT_VERIFICATION
  ├─ inventory.csv
  └─ *.csv optionnels                 POST /:id/validate
                                        ├─ extract (unzip/adm-zip)
                                        ├─ read metadata.json
                                        ├─ schema version check (2.2.0)
                                        ├─ validate columns/types (bi-schema-registry)
                                        └─ BiUpload VALIDATED + preview.json

                                      GET /:id/raw-preview         (lecture brute)
                                      POST /:id/prepare
                                        ├─ dataPreparationService.prepare (nettoyage, types, enums)
                                        ├─ réconciliation sales vs sale_items
                                        ├─ _buildWarehouse (dimensions + faits en mémoire)
                                        └─ BiUpload PREPARED + preview.json

                                      GET /:id/transformation-preview  (avant/après)
                                      GET /:id/dimensional-model        (modèle en étoile + FK health)
                                      POST /:id/correct                 (corrections + overlays persistés)

                                      POST /:id/confirm-load
                                        ├─ gate : erreurs ERROR non résolues → 400
                                        ├─ replay corrections (re-typage + validation)
                                        ├─ TRANSACTION (120s)
                                        │   ├─ BiProcessingJob = PROCESSING
                                        │   ├─ _loadDimensions (DimTime seed, DimClient/Product/Supplier/Customer upsert)
                                        │   ├─ deleteMany faits du tenant (remplacement)
                                        │   ├─ _loadFacts (6 tables, lots de 1000, RI orphelins)
                                        │   └─ COMPLETED (job + upload)
                                        ├─ suppression preview.json
                                        └─ logs BiProcessingLog

                                      POST /bi/dashboards/generate-from-upload
                                        └─ BiDashboard DRAFT (+ template Metabase)
                                      GET /:id/report                  (rapport final)
```

**Points clés du pipeline :**
- **Un seul moteur de préparation** : le parcours historique `run()` (start-etl) et le parcours wizard
  passent tous deux par `dataPreparationService.prepare()` → comportement identique (coercition, enums, déduplication, réconciliation).
- **Rejouabilité des corrections** : corrections persistées par `rowIndex` stable et rejouées au chargement.
- **Remplacement, pas accumulation** : le snapshot du tenant est vidé avant recharge (promesse du wizard).
- **Isolation tenant** : `tenantId` systématique, `clientId` de l'upload prioritaire sur celui du ZIP.
- **Tracabilité** : `BiProcessingJob` + `BiProcessingLog` (INFO/WARN/ERROR par étape EXTRACT/LOAD/CANCELLED).
- **Enrichissement séparé** : `analytics-cache-service` relit les ZIP des uploads `COMPLETED` pour
  alimenter des métriques granulaires (heures de pointe, durée de service) absentes du schéma d'entrepôt.

---

## 14. Schéma de l'entrepôt de données

Modèle **en étoile** (1 dimension de fait centrale reliée à des dimensions). Les PK des dimensions
sont des **clés subrogées dérivées** : `cust_/prod_/supp_{client}_{id}` ; `DimTime.id` = `YYYYMMDD` (entier) ;
`DimClient.id` = `tenantId`.

```
                    ┌─────────────┐
                    │  DimTime    │  id (int YYYYMMDD), date, year, quarter, month, day, dayOfWeek, isWeekend
                    └──────▲──────┘
                           │ 1:N dimTimeId
   ┌────────────┐  ┌───────┴────────┐  ┌────────────┐
   │ DimClient  │  │  FactSale      │  │ DimCustomer│  tenantId, name, email, phone, address,
   └─────▲──────┘  │  (1/vente)     │  └─────▲──────┘  loyaltyPoints, totalSpent, visitCount,
         │         └───────▲────────┘        │        lastVisitDate, tags, isActive
         │ dimClientId     │ dimCustomerId   │
         │                 │
   ┌─────┴──────┐  ┌───────┴────────┐  ┌─────┴──────┐
   │ DimProduct │  │ FactSaleItem   │  │ DimSupplier│  name, contact, phone, email
   │ (name,     │  │ (1/ligne)      │  └───────────┘
   │  category, │  └────────────────┘
   │  family,   │
   │  barcode)  │
   └────────────┘
```

### Tables de dimensions (Prisma)

| Table | PK | Colonnes notables | Source CSV |
|---|---|---|---|
| `DimTime` | `id` (int YYYYMMDD) | date, year, quarter, month, day, dayOfWeek, isWeekend | dérivé (union de toutes les dates) |
| `DimClient` | `id` (= tenantId, unique) | tenantId, exportId, name, businessType | metadata.json |
| `DimCustomer` | `id` (cust_{client}_{id}) | customerId, name, email, phone, address, loyaltyPoints, totalSpent, visitCount, lastVisitDate, tags, isActive | customers.csv |
| `DimProduct` | `id` (prod_{client}_{id}) | productId, name, category, family, barcode | products.csv |
| `DimSupplier` | `id` (supp_{client}_{id}) | supplierId, name, contact, phone, email | suppliers.csv |

### Tables de faits (Prisma)

| Table | Grain | FKs | Mesures / attributs clés | Source CSV |
|---|---|---|---|---|
| `FactSale` | une ligne / vente | dimClientId, dimCustomerId, dimTimeId | saleId, customerId, total, tax, discount, paymentMethod, transactionHour | sales.csv |
| `FactSaleItem` | une ligne / produit vendu | dimClientId, dimProductId, dimTimeId | saleItemId, saleId, productId, quantity, unitPrice, lineTotal, vatRate, vatAmount, paymentMethod, productName, category, family, transactionHour | sale_items.csv |
| `FactInventory` | une ligne / instantané produit | dimProductId, dimTimeId | rowIndex, productName, stock, price, timesSold | inventory.csv |
| `FactAppointment` | une ligne / rendez-vous | dimTimeId | rowIndex, customerName, customerPhone, serviceId, duration, status | appointments.csv |
| `FactKitchenOrder` | une ligne / commande cuisine | dimTimeId | rowIndex, orderId, tableNumber, items, priority, status, transactionHour, startedAt, readyAt, completedAt | kitchen_orders.csv |
| `FactKitchenOrderItem` | une ligne / ligne commande | dimClientId, dimTimeId | kitchenOrderItemId, orderId, saleId, productId, productName, quantity, unitPrice, lineTotal, department, preparationTime, transactionHour | kitchen_order_items.csv |

### Règles d'intégrité notables

- Uniques : `FactSale(exportId, saleId)`, `FactSaleItem(exportId, saleItemId)`,
  `FactKitchenOrderItem(exportId, kitchenOrderItemId)`, `FactInventory(exportId, rowIndex)`,
  `FactAppointment(exportId, rowIndex)`, `FactKitchenOrder(exportId, rowIndex)`, `DimClient(tenantId)`.
- Contrôle d'orphelins à la charge : un fait référençant un `product_id` absent de `products.csv` est sauté (`orphanWarnings`).
- `FactSale.dimCustomerId` nul si `customer_id` absent du jeu `customers` (warning, pas de blocage).
- `transactionHour` : heure 0-23 extraite du timestamp POS (naïve locale) ; `DimTime` stocke le jour seul,
  l'heure de transaction est un entier de la fact, pas un horodatage.

---

## 15. Valeur métier par écran

| Écran / Étape | Valeur métier |
|---|---|
| 1. Upload | Réception sécurisée, tenant-isolée et anti-doublon de l'export client ; point d'entrée zéro-friction (drag & drop). |
| 2. Validation | Assurance qualité en amont ; évite de traiter des exports incomplets/obsolètes ; conformité de version. |
| 3. Aperçu brut | Transparence sur la donnée source ; détection précoce d'anomalies. |
| 4. Préparation | Nettoyage et typage automatiques (nombres, dates, enums, doublons) + réconciliation des ventes ; base d'une donnée fiable. |
| 5. Avant / après | Traçabilité des transformations et preuve de cohérence (réconciliation) présentées au métier. |
| 6. Modèle dimensionnel | Preuve de la modélisation (étoile, jointures, santé des relations, lignage) et exports documentaires (PNG/SVG/PDF/SQL). |
| 7. Corrections | Contrôle humain sur les valeurs douteuses ; documente et rejoue les corrections. |
| 8. Chargement | Livraison des données dans l'entrepôt avec remplacement propre du snapshot du client. |
| 9. Tableaux de bord | Activation de l'analytique : dashboard métier adapté au secteur, accessible dans l'espace analyste. |
| 10. Rapport final | Confirmation et trace de fin de parcours (fichier, lignes, durée, statut). |

---

## 16. Évaluation finale (forces, limites, améliorations)

### Forces
- **Contrat de schéma explicite** : `bi-schema-registry` est la source unique de vérité côté serveur,
  aligné sur le contrat POS (version 2.2.0) ; validation stricte des colonnes et des types.
- **Pipeline de préparation unifié** : un seul moteur (`data-preparation-service`) utilisé par le parcours
  historique et le wizard → comportement cohérent.
- **Isolation tenant systématique** : `tenantId` sur toutes les tables ; le `clientId` de l'upload prime
  sur celui du ZIP (sécurité anti-contamination).
- **Rejouabilité des corrections** : overlays persistés par `rowIndex` stable, re-typés et re-validés à la charge.
- **Remplacement propre du snapshot** : pas d'accumulation de doublons entre imports.
- **Traçabilité complète** : `BiProcessingJob` + `BiProcessingLog` + gates explicites (erreurs non résolues → blocage).
- **Lecture seule pour la modélisation** : le modèle dimensionnel, la santé des relations et les exports
  ne touchent ni à l'ETL ni à l'entrepôt.
- **UX soignée** : wizard 10 étapes, diagramme en étoile interactif, inspecteur de jointure avec SQL généré.

### Limites
- **Préparation synchrone et en mémoire** : le warehouse preview est construit en mémoire ; les très gros
  exports peuvent être lourds (timeout transaction 120 s à la charge).
- **Extraction ZIP via `unzip` système** : dépend d'un binaire Unix présent sur le serveur (fallback `adm-zip`).
- **`BiAnalysisRequest` auto-créée** à la fin du `run()` historique uniquement ; le parcours wizard ne
  passe pas par `run()` (pas de création de requête d'analyse, seulement upload → dashboard).
- **Analytics cache séparé** : les métriques granulaires (heures de pointe, durées) dépendent du
  `analytics-cache-service` qui relit les ZIP — fragilité si les ZIP sont nettoyés.
- **Statuts de dashboard** : la génération crée un `DRAFT` ; la publication passe par une revue manuelle
  (transitions validées côté `PATCH`).
- **Upload requiert `clientId`** : pas de parcours sans attribution préalable du client.
- **`start-etl` (parcours historique)** reste disponible sans wizard et sans gate de correction : deux
  chemins de charge coexistent.

### Améliorations possibles (hors périmètre, non implémentées)
- Traiter les très gros exports par lots avec sauvegarde de progression (reprise) plutôt qu'en mémoire.
- Faire transiter le wizard par le même pipeline `run()` (ou partager le gate de corrections) pour
  garantir un comportement unique sur les deux chemins.
- Ajouter un endpoint de purge/relecture du cache d'enrichissement déclenché par l'administrateur.
- Documenter et automatiser le workflow de publication des dashboards (DRAFT → READY_FOR_REVIEW → PUBLISHED).
- Rendre le bouton « Télécharger le rapport » (Step 10) fonctionnel (actuellement purement visuel).

---

*Fin du rapport. Audit réalisé en mode lecture seule ; aucune modification de code n'a été apportée.*
