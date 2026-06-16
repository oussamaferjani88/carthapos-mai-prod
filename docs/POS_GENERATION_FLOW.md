# POS Generation Flow - Complete Architecture

**Date:** January 31, 2026  
**Focus Folders:** admin, backend, pos-template, generated-pos

---

## 🎯 Overview

The system generates **customized Windows .exe POS installers** for clients. Each client gets a unique POS application with their own:
- Branding (logo, business name, colors)
- Selected modules (sales, inventory, kitchen, etc.)
- License key and expiration
- Theme customization

---

## 📁 Folder Structure & Roles

### 1. **pos-template/** (Source Template)
```
pos-template/
├── src/                    # React source code
│   ├── components/         # UI components
│   ├── pages/             # POS pages (sales, inventory, etc.)
│   ├── electron/          # Electron main process handlers
│   └── services/          # Business logic
├── public/
│   ├── electron-modular.cjs  # Electron entry point (CRITICAL)
│   └── preload.js           # Security bridge (CRITICAL)
├── package.json           # Dependencies & build config
└── vite.config.js         # Build configuration
```

**Purpose:** The "blueprint" that gets copied for each client

**Critical Files:**
- `public/electron-modular.cjs` - Main Electron process
- `public/preload.js` - Security layer for IPC
- These MUST be in git or GitHub Actions build fails

---

### 2. **generated-pos/** (Generated Projects)
```
generated-pos/
└── pos-[business]-[licensekey]/     # Example: pos-restaurant-ML04LKZ9
    ├── src/                         # Copied from pos-template
    ├── public/
    │   ├── electron-modular.cjs     # Copied
    │   ├── preload.js              # Copied
    │   └── app-config.json         # ✨ GENERATED (license key, business name)
    ├── dist/                       # ✨ Build output
    │   └── [BusinessName]-Setup.exe  # Final installer (downloaded from GitHub)
    ├── package.json                # Modified (productName, main entry)
    └── node_modules/               # Installed dependencies
```

**Purpose:** Temporary workspace for building client-specific POS

**Lifecycle:**
1. Created during generation
2. Customized with client data
3. **Either:**
   - Built locally on Render (⚠️ Fails - Wine issues)
   - **OR** Uploaded to GitHub Actions for Windows build (✅ Current method)
4. **.exe downloaded** from GitHub Actions artifact
5. **User downloads** the .exe from backend
6. **Folder can be deleted** after download (saves disk space)

**⚠️ Important:** This folder is in `.gitignore` (never committed)

---

### 3. **admin/** (Frontend - Admin Panel)
```
admin/src/
├── pages/
│   ├── pos/
│   │   └── POSGeneratorPage.jsx    # Main generation UI
│   └── Licenses.jsx                # View licenses
├── hooks/
│   ├── usePOSGenerator.js          # Generation orchestration
│   ├── usePOSConfiguration.js      # Theme/settings
│   └── usePOSModules.js            # Module selection
└── services/
    ├── licenseService.js           # License API calls
    └── posService.js               # POS generation API calls
```

**Purpose:** UI for admins to configure and generate POS applications

---

### 4. **backend/** (API Server)
```
backend/
├── routes/
│   └── pos.js                      # POST /api/pos/generate
├── utils/
│   ├── pos-generator.js            # Entry point
│   ├── githubActionsService.js     # GitHub API integration
│   └── generators/
│       ├── index.js                # Main orchestrator
│       ├── AssetManager.js         # Copies pos-template → generated-pos
│       ├── ProjectBuilder.js       # Project setup
│       ├── DependencyManager.js    # npm install
│       ├── ThemeCustomizer.js      # Apply colors/theme
│       ├── FilePatcher.js          # Modify files
│       └── BuildSystemManager.js   # Build .exe (disabled now)
└── prisma/
    └── schema.prisma               # Database (License model)
```

**Purpose:** Handles POS generation logic and GitHub Actions coordination

---

## 🔄 Complete Generation Flow

### **STEP 1: User Configures POS (Admin Panel)**

**File:** `admin/src/pages/pos/POSGeneratorPage.jsx`

```
User Actions:
1. Selects client
2. Chooses sector (restaurant, retail, etc.)
3. Selects modules (sales, inventory, kitchen, etc.)
4. Customizes theme:
   - Business name
   - Logo
   - Primary/secondary colors
   - Typography
5. Sets license:
   - Type: LIFETIME or SUBSCRIPTION
   - Expiration date (if subscription)
6. Clicks "Générer le POS (Complet)"
```

**Hook:** `usePOSGenerator.js:generatePOS()`

---

### **STEP 2: Frontend Sends Request**

**File:** `admin/src/services/posService.js`

```javascript
// POST /api/pos/generate
const response = await axios.post('/api/pos/generate', {
  licenseId: 'clx123abc',  // Created in previous step
  outputPath: null         // Let backend decide
});
```

**What happens:**
1. License created in database first
2. License includes:
   - Client info
   - Modules array
   - Configuration (theme, colors, business name)
3. Frontend waits for response (6-8 minutes)

---

### **STEP 3: Backend Receives Request**

**File:** `backend/routes/pos.js:18` (POST /api/pos/generate)

```javascript
router.post('/generate', async (req, res) => {
  const { licenseId } = req.body;
  
  // 1. Load license from database
  const license = await prisma.license.findUnique({
    where: { id: licenseId },
    include: { client, modules, configuration }
  });
  
  // 2. Call generator
  const result = await generatePOSApplication(license);
  
  // 3. Trigger GitHub Actions build
  const workflowRun = await githubService.triggerBuild({...});
  
  // 4. Wait for build to complete (polling every 10 seconds)
  while (status !== 'completed') { ... }
  
  // 5. Download artifact from GitHub
  const artifactZip = await githubService.downloadArtifactFromRun(...);
  
  // 6. Extract .exe and save to dist/
  const zip = new AdmZip(Buffer.from(artifactZip));
  const exeEntry = zipEntries.find(entry => entry.endsWith('.exe'));
  fs.writeFileSync(exePath, exeEntry.getData());
  
  // 7. Return success
  res.json({ message: 'POS généré avec succès', path: result.outputPath });
});
```

---

### **STEP 4: Backend Generates Project**

**File:** `backend/utils/generators/index.js:generatePOSApplication()`

#### 4.1 Initialize Project Builder
```javascript
const projectBuilder = new ProjectBuilder(license, outputPath);
const projectInfo = await projectBuilder.initialize();
// Creates: generated-pos/pos-restaurant-ML04LKZ9/
```

**Output:**
```
generated-pos/
└── pos-restaurant-ml04lkz9/   (empty folder created)
```

---

#### 4.2 Copy Template (AssetManager)
```javascript
const assetManager = new AssetManager(projectPath);
await assetManager.copyTemplate();
```

**What it does:**
```bash
# Recursively copy pos-template to generated-pos/[project]/
cp -r pos-template/* generated-pos/pos-restaurant-ml04lkz9/

# Skips:
- node_modules/
- dist/
- build/
- .git/
```

**Output:**
```
generated-pos/pos-restaurant-ml04lkz9/
├── src/          (copied)
├── public/       (copied)
├── package.json  (copied)
├── vite.config.js (copied)
└── ...
```

---

#### 4.3 Create Configuration File (AssetManager)
```javascript
await assetManager.createConfigFile(license);
```

**Creates:** `generated-pos/[project]/public/app-config.json`

```json
{
  "businessName": "Restaurant Le Gourmet",
  "licenseKey": "RESTAURANT-ML04LKZ9",
  "modules": ["sales", "inventory", "kitchen"],
  "theme": {
    "primaryColor": "#1e40af",
    "secondaryColor": "#f97316",
    "fontFamily": "Inter"
  },
  "sector": "restaurant"
}
```

**Purpose:** POS app reads this at runtime to show business name, check license, enable modules

---

#### 4.4 Update package.json (Backend Routes)
```javascript
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath));
packageJson.build.productName = "Restaurant Le Gourmet"; // Installer name
packageJson.main = "public/electron-modular.cjs";        // Electron entry
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson));
```

**Purpose:** Electron builder uses this to name the .exe file

---

#### 4.5 Install Dependencies (DependencyManager)
```javascript
const dependencyManager = new DependencyManager(projectPath, license);
await dependencyManager.installDependencies();
```

**Executes:**
```bash
cd generated-pos/pos-restaurant-ml04lkz9
npm install --legacy-peer-deps
```

**Output:** `node_modules/` folder with ~300MB of dependencies

---

#### 4.6 Apply Theme (ThemeCustomizer)
```javascript
const themeCustomizer = new ThemeCustomizer(projectPath, license);
await themeCustomizer.applyCustomization();
```

**What it does:**
- Modifies `tailwind.config.js` with custom colors
- Updates CSS variables in `src/index.css`
- Applies typography settings

---

#### 4.7 Apply File Patches (FilePatcher)
```javascript
const filePatcher = new FilePatcher(projectPath);
await filePatcher.applyAllPatches();
```

**What it does:**
- Fixes import paths
- Updates config references
- Applies any necessary code patches

---

### **STEP 5: Trigger GitHub Actions Build**

**File:** `backend/routes/pos.js:80-90`

```javascript
const workflowRun = await githubService.triggerBuild({
  projectName: 'pos-restaurant-ml04lkz9',
  licenseKey: 'RESTAURANT-ML04LKZ9',
  businessName: 'Restaurant Le Gourmet'
});
```

**What happens:**
```javascript
// backend/utils/githubActionsService.js
async triggerBuild(params) {
  // POST https://api.github.com/repos/oussamaferjani88/Carthaposforprod/actions/workflows/build-pos.yml/dispatches
  await axios.post(url, {
    ref: 'main',
    inputs: {
      project_name: params.projectName,
      license_key: params.licenseKey,
      business_name: params.businessName
    }
  });
  
  // Wait 3 seconds for GitHub to process
  await sleep(3000);
  
  // Fetch the workflow run ID
  const latestRun = await this.getLatestWorkflowRun();
  return { id: latestRun.id, runNumber: latestRun.run_number };
}
```

**Result:** GitHub Actions workflow starts running on Windows runner

---

### **STEP 6: GitHub Actions Builds Windows .exe**

**File:** `.github/workflows/build-pos.yml`

```yaml
name: Build POS Windows Installer

on:
  workflow_dispatch:
    inputs:
      project_name:    # pos-restaurant-ml04lkz9
      license_key:     # RESTAURANT-ML04LKZ9
      business_name:   # Restaurant Le Gourmet

jobs:
  build-windows:
    runs-on: windows-latest  # ✅ Native Windows (no Wine needed)
```

#### 6.1 Checkout Repository
```yaml
- uses: actions/checkout@v4
```
Clones the entire repository (includes pos-template/)

---

#### 6.2 Setup Node.js
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
```

---

#### 6.3 Install Template Dependencies
```yaml
- name: Install pos-template dependencies
  working-directory: ./pos-template
  run: npm install --legacy-peer-deps
```

---

#### 6.4 Copy Template to Generated Project
```yaml
- name: Create project directory
  run: |
    robocopy "pos-template" "generated-pos\${{ inputs.project_name }}" /E /NFL /NDL /NJH /NJS /NP
    if ($LASTEXITCODE -le 7) { exit 0 } else { exit $LASTEXITCODE }
```

**What this does:**
```
Copies:
  pos-template/* → generated-pos/pos-restaurant-ml04lkz9/

Including:
  ✅ src/
  ✅ public/electron-modular.cjs  (CRITICAL - must be in git)
  ✅ public/preload.js           (CRITICAL - must be in git)
  ✅ package.json
  ✅ vite.config.js
```

**⚠️ If electron-modular.cjs or preload.js missing in git:**
```
ERROR: public folder not found!
Build fails
```

---

#### 6.5 Verify Files Copied
```yaml
- name: Verify files copied
  run: |
    if (Test-Path "public") {
      Get-ChildItem "public" -Name
    } else {
      Write-Host "ERROR: public folder not found!"
      exit 1
    }
```

**Expected output:**
```
electron-modular.cjs
preload.js
```

---

#### 6.6 Install Project Dependencies
```yaml
- name: Install project dependencies
  working-directory: ./generated-pos/${{ inputs.project_name }}
  run: npm install --legacy-peer-deps
```

---

#### 6.7 Update License Configuration
```yaml
- name: Update license configuration
  run: |
    $config = @{
      businessName = "${{ inputs.business_name }}"
      licenseKey = "${{ inputs.license_key }}"
    }
    $config | ConvertTo-Json | Out-File "public/app-config.json" -Encoding UTF8
```

**Creates:** `public/app-config.json` with business name and license key

---

#### 6.8 Build Electron Application
```yaml
- name: Build Electron application
  working-directory: ./generated-pos/${{ inputs.project_name }}
  run: npm run build:electron
```

**What this runs:**
```json
// package.json
"scripts": {
  "build:electron": "npm run build:safe && electron-builder"
}
```

**Process:**
1. `npm run build:safe` → Vite builds React app to `dist/`
2. `electron-builder` → Packages Electron + dist/ into Windows installer

**Output:** `release/Restaurant-Le-Gourmet-Setup-1.0.0.exe` (~109 MB)

---

#### 6.9 Upload Artifact
```yaml
- name: Upload installer as artifact
  uses: actions/upload-artifact@v4
  with:
    name: ${{ inputs.project_name }}-installer
    path: generated-pos/${{ inputs.project_name }}/release/*.exe
    retention-days: 7
```

**What happens:**
- .exe uploaded to GitHub Actions artifacts storage
- Artifact name: `pos-restaurant-ml04lkz9-installer`
- Retained for 7 days
- Backend can download via GitHub API

---

### **STEP 7: Backend Polls Build Status**

**File:** `backend/routes/pos.js:92-124`

```javascript
// Wait for build to complete
const maxAttempts = 90; // 90 * 10 seconds = 15 minutes
let attempts = 0;

while (attempts < maxAttempts) {
  await sleep(10000); // Wait 10 seconds
  attempts++;
  
  const status = await githubService.getWorkflowStatus(workflowRun.id);
  
  if (status.status === 'completed') {
    if (status.conclusion === 'success') {
      console.log('✅ Build completed successfully');
      break;
    } else {
      return res.status(500).json({ error: 'Build failed' });
    }
  }
  
  if (attempts % 6 === 0) {
    console.log(`⏳ Build in progress... (${Math.floor(attempts / 6)} minutes)`);
  }
}
```

**Timeline:**
- 0:00 - Workflow triggered
- 0:10 - Check status (status: 'queued')
- 0:20 - Check status (status: 'in_progress')
- ...
- 6:00 - Check status (status: 'completed', conclusion: 'success')

---

### **STEP 8: Download Artifact from GitHub**

**File:** `backend/routes/pos.js:126-150`

```javascript
// Download artifact
const artifactName = 'pos-restaurant-ml04lkz9-installer';
const artifactZip = await githubService.downloadArtifactFromRun(workflowRun.id, artifactName);

console.log(`✅ Artifact downloaded: ${artifactZip.byteLength} bytes`); // ~109 MB
```

**What happens:**
```javascript
// backend/utils/githubActionsService.js
async downloadArtifactFromRun(runId, artifactName) {
  // 1. Get list of artifacts for this run
  const response = await axios.get(
    `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/artifacts`
  );
  
  // 2. Find our artifact
  const artifact = response.data.artifacts.find(a => a.name === artifactName);
  
  // 3. Download the zip file
  const downloadResponse = await axios.get(artifact.archive_download_url, {
    responseType: 'arraybuffer'
  });
  
  return downloadResponse.data; // Buffer containing zip
}
```

---

### **STEP 9: Extract .exe from Artifact**

**File:** `backend/routes/pos.js:135-150`

```javascript
// Extract .exe from zip
const AdmZip = require('adm-zip');
const zip = new AdmZip(Buffer.from(artifactZip));
const zipEntries = zip.getEntries();

// Find .exe file
const exeEntry = zipEntries.find(entry => entry.entryName.endsWith('.exe'));

if (!exeEntry) {
  return res.status(500).json({ error: 'No .exe found in artifact' });
}

// Save to dist/ folder
const distFolder = path.join(result.outputPath, 'dist');
fs.mkdirSync(distFolder, { recursive: true });
const exePath = path.join(distFolder, path.basename(exeEntry.entryName));
fs.writeFileSync(exePath, exeEntry.getData());

console.log(`💾 Installer saved to: ${exePath}`);
```

**Output:**
```
generated-pos/pos-restaurant-ml04lkz9/dist/Restaurant-Le-Gourmet-Setup-1.0.0.exe
```

**File size:** ~109 MB

---

### **STEP 10: Update License Status**

**File:** `backend/routes/pos.js:152-159`

```javascript
await prisma.license.update({
  where: { id: licenseId },
  data: {
    buildStatus: 'completed',
    buildRunId: String(workflowRun.id),
    buildProjectPath: result.outputPath
  }
});
```

**Database:**
```sql
UPDATE licenses SET
  build_status = 'completed',
  build_run_id = '21501618201',
  build_project_path = '/opt/render/project/src/generated-pos/pos-restaurant-ml04lkz9'
WHERE id = 'clx123abc';
```

---

### **STEP 11: Return Success to Frontend**

**File:** `backend/routes/pos.js:182-187`

```javascript
res.json({
  message: 'POS généré avec succès',
  path: result.outputPath,
  projectName: 'pos-restaurant-ml04lkz9',
  licenseKey: 'RESTAURANT-ML04LKZ9'
});
```

**Frontend receives response after 6-8 minutes**

---

### **STEP 12: User Downloads .exe**

**Frontend:** Admin panel shows "Télécharger l'application" button

**User clicks:**
```javascript
// admin/src/pages/pos/POSGeneratorPage.jsx
const handleDownload = () => {
  window.location.href = `${API_URL}/api/pos/download?path=${posApplication.path}`;
};
```

**Backend:** `GET /api/pos/download?path=generated-pos/pos-restaurant-ml04lkz9`

```javascript
// backend/routes/pos.js:400+
router.get('/download', (req, res) => {
  const requestedPath = req.query.path;
  
  // Search for .exe in dist/ folder
  const installerPath = path.join(requestedPath, 'dist', '*.exe');
  
  if (fs.existsSync(installerPath)) {
    // Stream file to user
    res.download(installerPath);
  } else {
    res.status(404).json({ error: 'Installer not found' });
  }
});
```

**User receives:** `Restaurant-Le-Gourmet-Setup-1.0.0.exe` (109 MB)

---

## 🗂️ Critical File Relationships

### 1. **pos-template/public/electron-modular.cjs**
**Referenced by:**
- `pos-template/package.json` → `"main": "public/electron-modular.cjs"`
- Copied to: `generated-pos/[project]/public/electron-modular.cjs`
- **Must be in git** or GitHub Actions fails

**Purpose:** Electron main process entry point

---

### 2. **pos-template/public/preload.js**
**Referenced by:**
- `electron-modular.cjs` → `webPreferences: { preload: preloadPath }`
- Copied to: `generated-pos/[project]/public/preload.js`
- **Must be in git** or GitHub Actions fails

**Purpose:** Security bridge between Electron and React

---

### 3. **generated-pos/[project]/public/app-config.json**
**Created by:**
- Backend: `AssetManager.createConfigFile()`
- GitHub Actions: PowerShell script in workflow

**Read by:**
- POS app at runtime to get business name, license key, modules

**Format:**
```json
{
  "businessName": "Restaurant Le Gourmet",
  "licenseKey": "RESTAURANT-ML04LKZ9",
  "modules": ["sales", "inventory"],
  "theme": { "primaryColor": "#1e40af" }
}
```

---

### 4. **generated-pos/[project]/dist/[BusinessName]-Setup.exe**
**Created by:**
- GitHub Actions: electron-builder on Windows runner
- Downloaded by: Backend via GitHub API
- Served to: User via download endpoint

**Size:** ~109 MB  
**Contains:** Electron runtime + React app + Node.js

---

## 🔐 Database Schema

**License Model:**
```prisma
model License {
  id               String   @id @default(cuid())
  clientId         String
  licenseKey       String   @unique
  sector           String
  licenseType      LicenseType
  expirationDate   DateTime?
  isActive         Boolean  @default(true)
  
  // Build tracking (added for GitHub Actions)
  buildStatus      String?  // 'building', 'completed', 'failed'
  buildRunId       String?  // GitHub Actions run ID
  buildProjectPath String?  // Path to generated-pos/[project]/
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  client           Client   @relation(...)
  modules          LicenseModule[]
  configuration    LicenseConfiguration?
}
```

---

## 📊 Time Breakdown

| Step | Duration | Description |
|------|----------|-------------|
| 1. User config | 2-5 min | Admin panel form |
| 2. Frontend request | <1 sec | HTTP POST |
| 3. Backend receives | <1 sec | Validation |
| 4. Generate project | 10-30 sec | Copy template, install deps |
| 5. Trigger GitHub Actions | 2-3 sec | API call |
| 6. **GitHub Actions build** | **6-8 min** | Windows .exe compilation |
| 7. Backend polls status | 6-8 min | Waiting (polling every 10s) |
| 8. Download artifact | 5-10 sec | ~109 MB download |
| 9. Extract .exe | 2-5 sec | Unzip with adm-zip |
| 10. Update database | <1 sec | Set buildStatus='completed' |
| 11. Return response | <1 sec | JSON response |
| 12. User downloads | 30-60 sec | Browser download 109 MB |

**Total:** ~7-9 minutes (user waits during generation)

---

## 🚀 Key Optimizations

### Why GitHub Actions?

**❌ Local Build on Render (Failed):**
```
Render (Linux) + Wine + Electron Builder
= Unreliable, crashes, resource-intensive
```

**✅ GitHub Actions (Current):**
```
Render triggers → GitHub Windows runner → Native Windows build
= Reliable, no Wine, free compute
```

---

### Why generated-pos/ is Temporary

**Disk Space on Render Free Tier:** 512 MB - 1 GB

**Each project:**
- Source: ~50 MB
- node_modules: ~300 MB
- .exe: ~110 MB
- **Total: ~460 MB**

**Solution:**
```javascript
// After user downloads, delete the folder
fs.rmSync(projectPath, { recursive: true });
```

**Or keep only last 3 projects:**
```javascript
const folders = fs.readdirSync('generated-pos/');
if (folders.length > 3) {
  folders.slice(0, -3).forEach(folder => {
    fs.rmSync(path.join('generated-pos', folder), { recursive: true });
  });
}
```

---

## 🎯 Summary

**Purpose of generated-pos/:**
1. **Temporary workspace** for building client-specific POS
2. Each folder = one client's customized application
3. Contains modified template + client config + dependencies
4. **Uploaded to GitHub Actions** for Windows build
5. **.exe downloaded back** and saved to dist/
6. **User downloads** the .exe
7. **Folder can be deleted** to save space

**Why it's crucial:**
- Without it, we can't customize each client's POS
- GitHub Actions needs a complete project to build
- dist/ subfolder holds the final .exe for download

**Why it's ignored in git:**
- Can contain hundreds of projects (GB of data)
- Each project has node_modules (~300 MB)
- Temporary by nature (deleted after download)
- Would bloat repository unnecessarily

---

## 🎓 What to Focus On

Since you're focusing on POS generation in admin, here are the **critical integration points**:

### 1. **Admin → Backend Communication**
- `admin/src/pages/pos/POSGeneratorPage.jsx` → Sends generation request
- `admin/src/services/posService.js` → API calls
- `backend/routes/pos.js` → Receives and processes

### 2. **Backend → GitHub Actions**
- `backend/utils/githubActionsService.js` → Triggers builds
- `.github/workflows/build-pos.yml` → Builds Windows .exe
- **Requires:** pos-template/public/ files in git

### 3. **generated-pos/ Management**
- Created by: `backend/utils/generators/AssetManager.js`
- Built by: GitHub Actions (not locally)
- Downloaded to: `generated-pos/[project]/dist/[name].exe`
- Served by: `backend/routes/pos.js` download endpoint

### 4. **Files That Must Exist**
- ✅ pos-template/public/electron-modular.cjs
- ✅ pos-template/public/preload.js
- ✅ .github/workflows/build-pos.yml
- ✅ Environment variables on Render (GITHUB_TOKEN, etc.)

---

**Ready for your next instructions! 🚀**
