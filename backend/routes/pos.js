const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const { PrismaClient } = require('@prisma/client');
const { generatePOSApplication } = require('../utils/pos-generator');
const BuildSystemManager = require('../utils/generators/BuildSystemManager');
const { createLogger } = require('../utils/common/logger');
const GitHubActionsService = require('../utils/githubActionsService');
const router = express.Router();
const prisma = new PrismaClient();
const githubService = new GitHubActionsService();
const logger = createLogger('POS Routes');

const execAsync = promisify(exec);

// POST /api/pos/generate - Générer une application POS personnalisée
router.post('/generate', async (req, res) => {
  try {
    const { licenseId, outputPath } = req.body;

    if (!licenseId) {
      return res.status(400).json({ error: 'License ID is required' });
    }

    // Récupérer la licence complète
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      include: {
        client: true,
        modules: {
          include: {
            module: true
          }
        },
        configuration: true
      }
    });
    console.log('[POS DEBUG] [Backend] Loaded license for generation:', JSON.stringify(license, null, 2));

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (!license.isActive) {
      return res.status(400).json({ error: 'License is not active' });
    }

    // Generation mode:
    // - LOCAL_BUILD=true => full local .exe build (unless fast mode is requested)
    // - LOCAL_BUILD=false => source generation only (build delegated externally)
    const localBuild = process.env.LOCAL_BUILD === 'true';
    const fastLocalGeneration = process.env.FAST_LOCAL_GENERATION === 'true' || req.body.fastMode === true;
    const skipBuild = !localBuild || fastLocalGeneration;
    const result = await generatePOSApplication(license, outputPath, {
      skipBuild,
      skipNodeModulesInstall: skipBuild
    });

    // Mettre à jour le productName et assurer le bon fichier main dans package.json avant la construction
    const packageJsonPath = path.join(result.outputPath, 'package.json');
    
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const businessName = license.configuration?.businessName || license.client.name;
      packageJson.build.productName = businessName;

      // IMPORTANT: s'assurer que l'app Electron démarre avec electron-modular.cjs (version refactorisée)
      // La version modulaire contient tous les handlers IPC organisés en composants séparés
      if (packageJson.main !== 'public/electron-modular.cjs') {
        packageJson.main = 'public/electron-modular.cjs';
      }

      fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    }

    // Build metadata
    const businessName = license.configuration?.businessName || license.client.name;
    const projectName = `pos-${businessName.toLowerCase().replace(/\s+/g, '-')}-${license.licenseKey.split('-')[1]}`;
    let localExecutablePath = result.executablePath || null;

    if (localBuild && localExecutablePath && fs.existsSync(localExecutablePath)) {
      const rootExePath = path.join(result.outputPath, path.basename(localExecutablePath));
      if (rootExePath !== localExecutablePath) {
        fs.copyFileSync(localExecutablePath, rootExePath);
        localExecutablePath = rootExePath;
      }

      const releaseFolder = path.join(result.outputPath, 'release');
      if (fs.existsSync(releaseFolder)) {
        fs.rmSync(releaseFolder, { recursive: true, force: true });
      }
    }

    // Save build metadata to database (best-effort, non-blocking)
    try {
      await prisma.license.update({
        where: { id: licenseId },
        data: {
          buildStatus: localBuild ? (skipBuild ? 'source_ready' : 'completed') : 'source_ready',
          buildProjectPath: result.outputPath,
          buildProjectName: projectName
        }
      });
    } catch (updateError) {
      logger.warn('Failed to save build metadata (non-fatal):', updateError.message);
    }

    // Trigger GitHub Actions build if configured (fire-and-forget, never block response)
    const hasGitHubConfig = !!(process.env.GITHUB_TOKEN && process.env.GITHUB_OWNER && process.env.GITHUB_REPO);
    
    if (!localBuild && hasGitHubConfig) {
      githubService.triggerBuild({
        projectName,
        licenseKey: license.licenseKey,
        businessName,
        clientName: license.client.name,
        modules: license.modules.map(m => m.module?.code || m.name).join(','),
        theme: license.configuration?.theme || 'modern'
      }).then(async (workflowRun) => {
        logger.info('GitHub Actions build triggered:', workflowRun?.id);
        try {
          await prisma.license.update({
            where: { id: licenseId },
            data: { buildStatus: 'building', buildRunId: String(workflowRun.id) }
          });
        } catch {}
      }).catch(err => {
        logger.warn('GitHub Actions trigger failed (non-fatal):', err.message);
      });
    } else if (!localBuild) {
      logger.info('GitHub Actions not configured — skipping CI build. Source files are ready.');
    }
    
    // Return success response immediately
    const buildStatus = localBuild
      ? (skipBuild ? 'source_ready' : 'completed')
      : 'source_ready';

    res.json({
      message: skipBuild
        ? 'POS source generation completed'
        : 'POS generation started - build in progress',
      path: result.outputPath,
      executablePath: localBuild && !skipBuild ? localExecutablePath : null,
      projectName,
      licenseKey: license.licenseKey,
      buildStatus,
      licenseId,
      estimatedTime: localBuild
        ? (skipBuild ? '10-60 seconds' : '3-8 minutes')
        : '10-60 seconds',
      note: localBuild
        ? (skipBuild
          ? 'Fast local source generation complete. Trigger installer build explicitly when needed.'
          : 'Local generation complete. Use executablePath or output path for testing.')
        : 'Source generation complete. Set up GitHub Actions or build locally to produce .exe.'
    });
    
  } catch (error) {
    console.error('Error generating POS application:', error);
    res.status(500).json({ 
      error: 'Failed to generate POS application',
      details: error.message
    });
  }
});

// GET /api/pos/build-status/:licenseId - Check GitHub Actions build status
router.get('/build-status/:licenseId', async (req, res) => {
  try {
    const { licenseId } = req.params;
    
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: {
        buildStatus: true,
        buildRunId: true,
        buildProjectPath: true,
        buildProjectName: true,
        licenseKey: true
      }
    });
    
    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }
    
    if (!license.buildRunId) {
      return res.json({ status: 'not_started' });
    }
    
    // Check GitHub Actions status
    const status = await githubService.getWorkflowStatus(license.buildRunId);
    
    if (status.status === 'completed' && status.conclusion === 'success') {
      // Mark as completed in database, but don't download here
      // Download happens on-demand in /download endpoint to save memory
      if (license.buildStatus !== 'completed') {
        await prisma.license.update({
          where: { id: licenseId },
          data: { buildStatus: 'completed' }
        });
        console.log(`✅ Build completed for workflow ${license.buildRunId}`);
      }
      
      return res.json({ status: 'completed', downloadPath: license.buildProjectPath });
    } else if (status.status === 'completed') {
      await prisma.license.update({
        where: { id: licenseId },
        data: { buildStatus: 'failed' }
      });
      return res.json({ status: 'failed', conclusion: status.conclusion });
    } else {
      return res.json({ status: 'building', progress: status.status });
    }
    
  } catch (error) {
    console.error('Error checking build status:', error);
    res.status(500).json({ error: 'Failed to check build status', details: error.message });
  }
});

// DELETE /api/pos/cleanup/:licenseId - Delete build artifacts to free space
router.delete('/cleanup/:licenseId', async (req, res) => {
  try {
    const { licenseId } = req.params;
    
    const license = await prisma.license.findUnique({
      where: { id: licenseId },
      select: {
        buildProjectPath: true,
        buildStatus: true
      }
    });

    if (!license) {
      return res.status(404).json({ error: 'License not found' });
    }

    if (license.buildProjectPath && fs.existsSync(license.buildProjectPath)) {
      console.log(`🧹 Cleaning up build directory: ${license.buildProjectPath}`);
      fs.rmSync(license.buildProjectPath, { recursive: true, force: true });
      
      await prisma.license.update({
        where: { id: licenseId },
        data: { 
          buildStatus: 'cleaned',
          buildProjectPath: null 
        }
      });
      
      return res.json({ message: 'Build artifacts cleaned up successfully' });
    } else {
      return res.json({ message: 'Nothing to clean up' });
    }

  } catch (error) {
    console.error('Error cleaning up build:', error);
    res.status(500).json({ error: 'Failed to cleanup build', details: error.message });
  }
});

// POST /api/pos/build - Builder une application POS existante
router.post('/build', async (req, res) => {
  try {
    const { projectPath, platform } = req.body;

    if (!projectPath) {
      return res.status(400).json({ error: 'Project path is required' });
    }

    if (!fs.existsSync(projectPath)) {
      return res.status(404).json({ error: 'Project path not found' });
    }

    const packageJsonPath = path.join(projectPath, 'package.json');
    if (!fs.existsSync(packageJsonPath)) {
      return res.status(400).json({ error: 'Invalid POS project - package.json not found' });
    }

    // Installer les dépendances si nécessaire
    const nodeModulesPath = path.join(projectPath, 'node_modules');
    if (!fs.existsSync(nodeModulesPath)) {
      console.log('Installing dependencies...');
      await execAsync('npm ci --legacy-peer-deps', { cwd: projectPath });
    }

    // Builder l'application avec forçage de la création de l'installateur
    let buildCommand;
    if (platform === 'win') {
      buildCommand = 'npm run build && npx electron-builder --win --publish=never';
    } else {
      buildCommand = platform ? `npm run build:${platform}` : 'npm run build && npx electron-builder --publish=never';
    }
    
    console.log(`Building POS application with command: ${buildCommand}`);
    
    const { stdout, stderr } = await execAsync(buildCommand, { 
      cwd: projectPath,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    console.log('Build stdout:', stdout);
    if (stderr) console.log('Build stderr:', stderr);

    // Trouver le chemin de l'installateur généré
    const distPath = path.join(projectPath, 'dist');
    let executablePath = null;

    if (fs.existsSync(distPath)) {
      const distContents = fs.readdirSync(distPath);
      console.log('Dist folder contents:', distContents);
      
      // Look for installer files (Setup.exe, etc.)
      const installerFile = distContents.find(file => {
        const fileName = file.toLowerCase();
        return fileName.endsWith('.exe') && (
          fileName.includes('setup') ||
          fileName.includes('install') ||
          fileName.includes('installer')
        );
      });
      
      if (installerFile) {
        executablePath = path.join(distPath, installerFile);
        console.log('Found installer:', executablePath);
      } else {
        console.log('No installer found in dist folder, contents:', distContents);
        
        // Fallback: check for any .exe file that's not in win-unpacked
        const exeFile = distContents.find(file => file.endsWith('.exe'));
        if (exeFile) {
          executablePath = path.join(distPath, exeFile);
          console.log('Found .exe file:', executablePath);
        }
      }
    }

    res.json({
      message: 'POS application built successfully',
      projectPath,
      executablePath,
      buildOutput: stdout,
      buildErrors: stderr
    });
  } catch (error) {
    console.error('Error building POS application:', error);
    res.status(500).json({ 
      error: 'Failed to build POS application',
      details: error.message
    });
  }
});

// GET /api/pos/templates - Récupérer les templates POS disponibles
router.get('/templates', async (req, res) => {
  try {
    const templatesPath = path.join(__dirname, '..', '..', 'pos-template');
    
    if (!fs.existsSync(templatesPath)) {
      return res.status(404).json({ error: 'POS templates not found' });
    }

    const templates = [];
    const templateDirs = fs.readdirSync(templatesPath);

    for (const dir of templateDirs) {
      const templatePath = path.join(templatesPath, dir);
      const templateConfigPath = path.join(templatePath, 'template.json');
      
      if (fs.existsSync(templateConfigPath)) {
        try {
          const templateConfig = JSON.parse(fs.readFileSync(templateConfigPath, 'utf8'));
          templates.push({
            id: dir,
            path: templatePath,
            ...templateConfig
          });
        } catch (parseError) {
          console.error(`Error parsing template config for ${dir}:`, parseError);
        }
      }
    }

    res.json({ templates });
  } catch (error) {
    console.error('Error fetching POS templates:', error);
    res.status(500).json({ error: 'Failed to fetch POS templates' });
  }
});



router.get('/download', async (req, res) => {
  const requestedPath = req.query.path;
  const licenseIdParam = req.query.licenseId; // Optional: can provide license ID directly
  
  if (!requestedPath && !licenseIdParam) {
    return res.status(400).json({ error: 'Path parameter or licenseId is required' });
  }

  logger.info(`[DOWNLOAD] Requested path: ${requestedPath}, License ID: ${licenseIdParam}`);

  // RECOVERY LOGIC: Check database first if file is missing (e.g. after server restart)
  if (!fs.existsSync(requestedPath)) {
    try {
      logger.info(`🔍 Path missing: ${requestedPath}. Attempting recovery from DB...`);
      
      let license = null;
      
      // Try to find by path first
      if (requestedPath) {
        license = await prisma.license.findFirst({
          where: { buildProjectPath: requestedPath },
          select: {
            id: true,
            buildRunId: true,
            buildStatus: true,
            buildProjectName: true,
            buildProjectPath: true,
            licenseKey: true
          }
        });
        
        if (!license) {
          logger.warn(`❌ No license found for path: ${requestedPath}`);
        }
      }
      
      // If not found by path, try by licenseId
      if (!license && licenseIdParam) {
        logger.info(`Trying to find license by ID: ${licenseIdParam}`);
        license = await prisma.license.findUnique({
          where: { id: licenseIdParam },
          select: {
            id: true,
            buildRunId: true,
            buildStatus: true,
            buildProjectName: true,
            buildProjectPath: true,
            licenseKey: true
          }
        });
        
        if (license && license.buildProjectPath) {
          logger.info(`✅ Found license by ID with path: ${license.buildProjectPath}`);
          // Use the path from database
          const dbPath = license.buildProjectPath;
          if (fs.existsSync(dbPath)) {
            logger.info(`Path from DB exists, using it: ${dbPath}`);
            // Continue with database path
          } else {
            logger.warn(`Path from DB also doesn't exist: ${dbPath}`);
          }
        }
      }
      
      if (license && license.buildRunId && license.buildStatus === 'completed') {
        // We have a license pointing to this path. Check GitHub.
        logger.info(`Found license with runId: ${license.buildRunId}, checking GitHub...`);
        
        try {
          const status = await githubService.getWorkflowStatus(license.buildRunId);
          
          if (status.status === 'completed' && status.conclusion === 'success') {
            logger.info('✅ Found valid build on GitHub. Restoring artifacts...');
            
            // Use the actual path from database if available
            const actualPath = license.buildProjectPath || requestedPath;
            
            // Use stored project name from database
            const projectName = license.buildProjectName || path.basename(actualPath);
            const artifactName = `${projectName}-installer`;
            
            logger.info(`Attempting to download artifact: ${artifactName}`);
            
            const artifactZip = await githubService.downloadArtifactFromRun(license.buildRunId, artifactName);
            
            // Save to temp file
            const tempZipPath = path.join(actualPath, 'temp-artifact.zip');
            fs.mkdirSync(actualPath, { recursive: true });
            fs.writeFileSync(tempZipPath, Buffer.from(artifactZip));
            
            // Extract using streaming (memory efficient)
            const unzipper = require('unzipper');
            const distFolder = path.join(actualPath, 'dist');
            fs.mkdirSync(distFolder, { recursive: true });
            
            let exeFound = false;
            await fs.createReadStream(tempZipPath)
              .pipe(unzipper.Parse())
              .on('entry', (entry) => {
                const fileName = entry.path;
                if (fileName.endsWith('.exe')) {
                  const exePath = path.join(distFolder, path.basename(fileName));
                  entry.pipe(fs.createWriteStream(exePath));
                  exeFound = true;
                } else {
                  entry.autodrain();
                }
              })
              .promise();
            
            // Cleanup temp file
            fs.unlinkSync(tempZipPath);
            
            if (exeFound) {
              logger.info(`💾 Recovered .exe successfully`);
              // File restored! Code will continue below to serve it.
            } else {
               throw new Error('No .exe in artifact');
            }
          } else {
            logger.warn(`Build not successful: ${status.status} / ${status.conclusion}`);
            return res.status(404).json({ 
              error: 'Build not completed successfully', 
              path: requestedPath,
              buildStatus: status.status,
              buildConclusion: status.conclusion
            });
          }
        } catch (recoveryError) {
          logger.error('Recovery failed:', recoveryError.message);
          return res.status(404).json({ 
            error: 'Path not found and recovery failed', 
            path: requestedPath,
            details: recoveryError.message
          });
        }
      } else {
        logger.warn(`No valid license found for path: ${requestedPath}`);
        
        // Try to fetch any recent builds to diagnose the issue
        try {
          const recentBuilds = await prisma.license.findMany({
            where: {
              buildStatus: { not: null }
            },
            select: {
              id: true,
              buildStatus: true,
              buildProjectPath: true,
              buildProjectName: true,
              createdAt: true
            },
            orderBy: { updatedAt: 'desc' },
            take: 3
          });
          
          logger.info('Recent builds in database:', JSON.stringify(recentBuilds, null, 2));
          
          return res.status(404).json({ 
            error: 'Path not found - no valid build record', 
            path: requestedPath,
            diagnostics: {
              recentBuilds: recentBuilds.length > 0 ? recentBuilds : [],
              suggestion: recentBuilds.length === 0 
                ? 'No builds found in database. Check if generation completed successfully.'
                : 'Build record exists but path doesn\'t match. Try regenerating the POS.'
            }
          });
        } catch (diagnosticError) {
          return res.status(404).json({ 
            error: 'Path not found - no valid build record', 
            path: requestedPath 
          });
        }
      }
    } catch (dbError) {
      logger.error('Error during recovery check:', dbError);
      return res.status(404).json({ 
        error: 'Path not found', 
        path: requestedPath,
        details: dbError.message
      });
    }
  }

  // Check if there's a pending build for this path (Normal flow)
  try {
    const license = await prisma.license.findFirst({
      where: { buildProjectPath: requestedPath },
      select: {
        id: true,
        buildRunId: true,
        buildStatus: true,
        buildProjectName: true,
        licenseKey: true
      }
    });
    
    // Check if .exe file already exists in dist/ folder
    const distFolder = path.join(requestedPath, 'dist');
    const distExists = fs.existsSync(distFolder);
    let exeExists = false;
    
    if (distExists) {
      const distContents = fs.readdirSync(distFolder);
      exeExists = distContents.some(file => file.endsWith('.exe'));
      logger.info(`📂 Checked dist/ folder: ${exeExists ? 'Found .exe' : 'No .exe found'}`);
    }
    
    // Download artifact if build is completed but .exe file doesn't exist yet
    if (license && license.buildRunId && (license.buildStatus === 'building' || license.buildStatus === 'completed') && !exeExists) {
      logger.info(`🔍 Build status: ${license.buildStatus}, checking GitHub Actions...`);
      
      // Check if build has completed on GitHub Actions
      const status = await githubService.getWorkflowStatus(license.buildRunId);
      
      if (status.status === 'completed' && status.conclusion === 'success') {
        logger.info('✅ Build completed on GitHub! Downloading artifact now...');
        
        // Download and extract .exe using stored project name
        const projectName = license.buildProjectName || path.basename(requestedPath);
        const artifactName = `${projectName}-installer`;
        
        logger.info(`📥 Attempting to download artifact: ${artifactName}`);
        
        try {
          const artifactZip = await githubService.downloadArtifactFromRun(license.buildRunId, artifactName);
          
          // Save artifact to temp file
          const tempZipPath = path.join(requestedPath, 'temp-artifact.zip');
          fs.writeFileSync(tempZipPath, Buffer.from(artifactZip));
          logger.info(`💾 Artifact saved to temp file: ${tempZipPath}`);
          
          // Extract using streaming (memory efficient - doesn't load entire zip)
          const unzipper = require('unzipper');
          fs.mkdirSync(distFolder, { recursive: true });
          
          let exeFound = false;
          await fs.createReadStream(tempZipPath)
            .pipe(unzipper.Parse())
            .on('entry', (entry) => {
              const fileName = entry.path;
              if (fileName.endsWith('.exe')) {
                const exePath = path.join(distFolder, path.basename(fileName));
                entry.pipe(fs.createWriteStream(exePath));
                exeFound = true;
                logger.info(`💾 Extracting .exe: ${path.basename(fileName)}`);
              } else {
                entry.autodrain();
              }
            })
            .promise();
          
          // Delete temp zip file
          fs.unlinkSync(tempZipPath);
          logger.info(`🗑️ Temp file deleted`);
          
          if (exeFound) {
            await prisma.license.update({
              where: { id: license.id },
              data: { buildStatus: 'completed' }
            });
            
            logger.info(`✅ .exe extraction complete`);
            // Continue to download logic below
          } else {
            logger.error('❌ No .exe file found in artifact zip');
            return res.status(500).json({ 
              error: 'Build completed but no .exe found in artifact',
              artifactName: artifactName
            });
          }
        } catch (dlError) {
          logger.error('Error downloading artifact on-demand:', dlError);
          
          // Cleanup temp file if exists
          const tempZipPath = path.join(requestedPath, 'temp-artifact.zip');
          if (fs.existsSync(tempZipPath)) {
            fs.unlinkSync(tempZipPath);
            logger.info('🗑️ Cleaned up temp file after error');
          }
          
          return res.status(500).json({ 
            error: 'Failed to download artifact from GitHub',
            details: dlError.message,
            artifactName: artifactName
          });
        }
      } else if (status.status !== 'completed') {
        // Return 202 for both HEAD and GET requests (HEAD won't send body)
        return res.status(202)
          .set('X-Build-Status', status.status)
          .json({ 
            error: 'Build still in progress',
            buildStatus: status.status,
            message: 'Please wait a few more minutes and try again'
          });
      }
    }
  } catch (error) {
    logger.error('Error checking build status:', error);
  }

  const stats = fs.statSync(requestedPath);
  let installerPath = null;
  const searchedPaths = [];

  // If it's a file, use it directly
  if (stats.isFile()) {
    installerPath = requestedPath;
  } else if (stats.isDirectory()) {
    // Search in multiple possible locations for the installer
    const searchLocations = [
      requestedPath,                          // Root project directory (local build prefers this)
      path.join(requestedPath, 'dist'),      // Check dist/ (GitHub Actions saves here)
      path.join(requestedPath, 'release'),
      path.join(requestedPath, 'out'),
      path.join(requestedPath, 'build')
    ];

    for (const searchPath of searchLocations) {
      searchedPaths.push(searchPath);
      
      if (fs.existsSync(searchPath)) {
        const contents = fs.readdirSync(searchPath);
        
        logger.info(`🔍 Searching in ${searchPath}, found: ${contents.join(', ')}`);
        
        // Look for installer files with common patterns
        const installerFile = contents.find(file => {
          const fileName = file.toLowerCase();
          return fileName.endsWith('.exe') && (
            fileName.includes('setup') ||
            fileName.includes('install') ||
            fileName.includes('installer') ||
            fileName.includes('-win') ||
            fileName.includes('windows')
          );
        });
        
        if (installerFile) {
          installerPath = path.join(searchPath, installerFile);

          // If installer is in release/dist during local build, copy to root for direct download
          if (process.env.LOCAL_BUILD === 'true' && searchPath !== requestedPath) {
            const rootExePath = path.join(requestedPath, path.basename(installerFile));
            if (!fs.existsSync(rootExePath)) {
              fs.copyFileSync(installerPath, rootExePath);
            }
            if (searchPath.endsWith(path.sep + 'release')) {
              fs.rmSync(searchPath, { recursive: true, force: true });
            }
            installerPath = rootExePath;
          }

          logger.info(`✅ Found installer: ${installerPath}`);
          break;
        }
        
        // Fallback: look for any .exe file that's not in win-unpacked
        if (!installerPath) {
          const exeFile = contents.find(file => 
            file.endsWith('.exe') && !searchPath.includes('win-unpacked')
          );
          if (exeFile) {
            installerPath = path.join(searchPath, exeFile);

            if (process.env.LOCAL_BUILD === 'true' && searchPath !== requestedPath) {
              const rootExePath = path.join(requestedPath, path.basename(exeFile));
              if (!fs.existsSync(rootExePath)) {
                fs.copyFileSync(installerPath, rootExePath);
              }
              if (searchPath.endsWith(path.sep + 'release')) {
                fs.rmSync(searchPath, { recursive: true, force: true });
              }
              installerPath = rootExePath;
            }

            logger.info(`✅ Found .exe: ${installerPath}`);
            break;
          }
        }
      }
    }
    
    if (!installerPath) {
      const localBuild = process.env.LOCAL_BUILD === 'true';

      if (localBuild) {
        logger.warn('LOCAL_BUILD is enabled but no installer was found. Skipping download-time rebuild to avoid long duplicate builds.');
      }

      if (!installerPath) {
        const fastLocalGeneration = process.env.FAST_LOCAL_GENERATION === 'true';
        // On Linux (Render), .exe can't be built - offer source code instead
        logger.info('No .exe installer found - checking for dist/ folder (Linux build)');

        const distPath = path.join(requestedPath, 'dist');
        if (fs.existsSync(distPath) && !process.env.LOCAL_BUILD) {
          logger.info('Found dist/ folder - creating source code zip for download');

          // Create a zip of the project for user to build locally on Windows
          const archiver = require('archiver');
          const projectName = path.basename(requestedPath);
          const zipFileName = `${projectName}-source.zip`;

          res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
          res.setHeader('Content-Type', 'application/zip');

          const archive = archiver('zip', { zlib: { level: 9 } });

          archive.on('error', (err) => {
            logger.error('Zip creation error:', err);
            if (!res.headersSent) {
              res.status(500).json({ error: 'Error creating zip file' });
            }
          });

          archive.pipe(res);

          // Add all project files except node_modules (too large)
          archive.glob('**/*', {
            cwd: requestedPath,
            ignore: ['node_modules/**', '.git/**', 'release/**']
          });

          archive.finalize();

          logger.info(`📦 Downloading source code: ${zipFileName}`);
          return; // Exit early
        }

        const errorResponse = {
          error: 'No installer file found in the project directory',
          path: requestedPath,
          searchedPaths: searchedPaths,
          suggestion: localBuild
            ? (fastLocalGeneration
              ? 'Fast local generation mode is enabled (source-only). To build installer: disable FAST_LOCAL_GENERATION and regenerate.'
              : 'The build process did not produce an installer .exe file. This usually means the build failed. Regenerating will retry the build with the latest fixes.')
            : 'Windows .exe can only be built on Windows. Download source code and run "npm run build:electron" on Windows.',
          action: localBuild ? 'REGENERATE' : 'DOWNLOAD_SOURCE'
        };
        
        logger.warn('Download failed - installer not found:', errorResponse);
        return res.status(404).json(errorResponse);
      }
    }
  }

  if (!installerPath || !fs.existsSync(installerPath)) {
    return res.status(404).json({ 
      error: 'Installer file not found',
      requestedPath,
      resolvedPath: installerPath,
      searchedPaths: searchedPaths
    });
  }

  // Set proper headers for installer download
  const fileName = path.basename(installerPath);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  res.setHeader('Content-Type', 'application/octet-stream');

  console.log(`📦 Downloading installer: ${installerPath}`);
  console.log(`📁 File size: ${fs.statSync(installerPath).size} bytes`);

  // Download the installer file
  res.download(installerPath, fileName, (err) => {
    if (err) {
      console.error('Download error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading installer' });
      }
    } else {
      console.log(`✅ Successfully downloaded: ${fileName}`);
    }
  });
});

// GET /api/pos/sectors - Récupérer les secteurs d'activité disponibles
router.get('/sectors', (req, res) => {
  const sectors = [
    {
      id: 'restaurant',
      name: 'Restaurant',
      description: 'Gestion complète pour restaurants avec tables, commandes cuisine, etc.',
      defaultModules: ['pos-core', 'tables', 'kitchen', 'inventory', 'reports'],
      icon: '🍽️'
    },
    {
      id: 'cafe',
      name: 'Café / Bar',
      description: 'Solution adaptée aux cafés et bars avec gestion rapide des commandes',
      defaultModules: ['pos-core', 'quick-service', 'inventory', 'reports'],
      icon: '☕'
    },
    {
      id: 'retail',
      name: 'Commerce de détail',
      description: 'Caisse pour magasins et boutiques avec gestion des stocks',
      defaultModules: ['pos-core', 'inventory', 'barcode', 'customer-management', 'reports'],
      icon: '🛍️'
    },
    {
      id: 'bakery',
      name: 'Boulangerie / Pâtisserie',
      description: 'Spécialisé pour boulangeries avec gestion des produits frais',
      defaultModules: ['pos-core', 'inventory', 'production', 'customer-management', 'reports'],
      icon: '🥖'
    },
    {
      id: 'pharmacy',
      name: 'Pharmacie',
      description: 'Solution pour pharmacies avec gestion des médicaments',
      defaultModules: ['pos-core', 'inventory', 'prescription', 'customer-management', 'reports'],
      icon: '💊'
    },
    {
      id: 'beauty',
      name: 'Salon de beauté',
      description: 'Gestion pour salons avec rendez-vous et services',
      defaultModules: ['pos-core', 'appointments', 'services', 'customer-management', 'reports'],
      icon: '💄'
    }
  ];

  res.json({ sectors });
});

module.exports = router;

