/**
 * GitHub Actions Integration
 * Triggers Windows build workflow for POS generation
 */

const axios = require('axios');

class GitHubActionsService {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.owner = process.env.GITHUB_OWNER || process.env.GITHUB_REPO_OWNER;
    this.repo = process.env.GITHUB_REPO || process.env.GITHUB_REPO_NAME;
    this.workflowId = 'build-pos.yml';
  }

  /**
   * Trigger GitHub Actions workflow to build Windows .exe
   * @param {Object} params - Build parameters
   * @param {string} params.projectName - POS project name
   * @param {string} params.licenseKey - License key
   * @param {string} params.businessName - Business name
   * @param {string} [params.branch] - Branch containing the customized project to build
   * @returns {Promise<Object>} Workflow run information
   */
  async triggerBuild(params) {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${this.workflowId}/dispatches`;

    // Capture the moment we dispatch — we'll correlate the newly-created run to
    // this exact moment, not just whatever GitHub lists as "most recent",
    // because workflow_dispatch does not return the run id in its response and
    // concurrent/earlier runs can otherwise be matched by mistake.
    const dispatchedAt = new Date();

    try {
      const response = await axios.post(
        url,
        {
          ref: 'main', // the workflow file on main is what runs
          inputs: {
            project_name: params.projectName,
            license_key: params.licenseKey,
            business_name: params.businessName,
            branch: params.branch || 'main'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28'
          }
        }
      );

      console.log(`✅ GitHub Actions workflow triggered for ${params.projectName}`);

      // Poll for the run created by THIS dispatch (correlated by timestamp).
      const run = await this.getDispatchedWorkflowRun(this.workflowId, dispatchedAt);

      return {
        success: true,
        message: 'Build triggered on GitHub Actions',
        projectName: params.projectName,
        id: run.id,
        runNumber: run.run_number,
        htmlUrl: run.html_url
      };
    } catch (error) {
      console.error('❌ Failed to trigger GitHub Actions:', error.response?.data || error.message);
      throw new Error(`GitHub Actions trigger failed: ${error.message}`);
    }
  }

  /**
   * Get latest workflow run for a specific workflow
   * @param {string} workflowId - Workflow file name
   * @returns {Promise<Object>} Latest run information
   */
  async getLatestWorkflowRun(workflowId = 'build-pos.yml') {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/runs`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        params: {
          per_page: 1,
          page: 1
        }
      });

      if (response.data.workflow_runs && response.data.workflow_runs.length > 0) {
        return response.data.workflow_runs[0];
      }

      throw new Error('No workflow runs found');
    } catch (error) {
      console.error('Failed to get latest workflow run:', error.message);
      throw error;
    }
  }

  /**
   * Get the workflow run that was created by a specific dispatch.
   *
   * Polls the workflow's runs (filtered to event=workflow_dispatch) and returns
   * the FIRST run whose created_at is >= dispatchedAt. This is the earliest run
   * created at or after the dispatch moment, which reliably identifies the run
   * we just triggered even when another run on the same workflow was created
   * recently or when GitHub's listing lags behind the dispatch.
   *
   * @param {string} workflowId - Workflow file name
   * @param {Date} dispatchedAt - Moment the dispatch was fired (inclusive cutoff)
   * @param {number} timeoutMs - Max total time to keep polling (default 30000)
   * @param {number} intervalMs - Delay between polls (default 2500)
   * @returns {Promise<Object>} The matched run information
   */
  async getDispatchedWorkflowRun(workflowId = 'build-pos.yml', dispatchedAt, timeoutMs = 30000, intervalMs = 2500) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/workflows/${workflowId}/runs`;
    const cutoff = new Date(dispatchedAt).toISOString();
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      try {
        const response = await axios.get(url, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Accept': 'application/vnd.github+json'
          },
          params: {
            event: 'workflow_dispatch',
            per_page: 10
          }
        });

        const runs = response.data.workflow_runs || [];
        // Workflow runs are newest-first. Find the first (newest) run created at
        // or after our dispatch cutoff — that is the run we just triggered.
        const matched = runs.find((r) => r.created_at && new Date(r.created_at) >= new Date(cutoff));

        if (matched) {
          console.log(`✅ Located dispatched workflow run #${matched.run_number} (id ${matched.id}) for dispatch at ${cutoff}`);
          return matched;
        }
      } catch (error) {
        console.error('Error polling for dispatched workflow run:', error.response?.data || error.message);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }

    const elapsed = Math.round((Date.now() - startedAt) / 1000);
    throw new Error(
      `Could not locate the triggered workflow run after ${elapsed}s — check GitHub Actions manually`
    );
  }

  /**
   * Get workflow run status
   * @param {string} runId - Workflow run ID
   * @returns {Promise<Object>} Run status
   */
  async getWorkflowStatus(runId) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      return {
        status: response.data.status,
        conclusion: response.data.conclusion,
        url: response.data.html_url
      };
    } catch (error) {
      console.error('Failed to get workflow status:', error.message);
      throw error;
    }
  }

  /**
   * Download artifact from a specific workflow run
   * @param {string} runId - Workflow run ID
   * @param {string} artifactName - Name of the artifact
   * @returns {Promise<Buffer>} Artifact zip file
   */
  async downloadArtifactFromRun(runId, artifactName) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/runs/${runId}/artifacts`;

    try {
      // Get artifacts for this specific run
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      console.log(`Found ${response.data.artifacts.length} artifacts for run ${runId}`);

      // Find the specific artifact
      const artifact = response.data.artifacts.find(a => a.name === artifactName);
      
      if (!artifact) {
        console.error(`Available artifacts: ${response.data.artifacts.map(a => a.name).join(', ')}`);
        throw new Error(`Artifact ${artifactName} not found`);
      }

      console.log(`Downloading artifact: ${artifact.name} (${artifact.size_in_bytes} bytes)`);

      // Download the artifact (it's a zip file)
      const downloadResponse = await axios.get(artifact.archive_download_url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        responseType: 'arraybuffer'
      });

      console.log(`✅ Artifact downloaded: ${downloadResponse.data.byteLength} bytes`);
      return downloadResponse.data;
    } catch (error) {
      console.error('Failed to download artifact:', error.message);
      throw error;
    }
  }

  /**
   * Download artifact from completed workflow (legacy method)
   * @param {string} artifactName - Name of the artifact
   * @returns {Promise<Buffer>} Artifact file
   */
  async downloadArtifact(artifactName) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/actions/artifacts`;

    try {
      // Get list of artifacts
      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      // Find the specific artifact
      const artifact = response.data.artifacts.find(a => a.name === artifactName);
      
      if (!artifact) {
        throw new Error(`Artifact ${artifactName} not found`);
      }

      // Download the artifact
      const downloadResponse = await axios.get(artifact.archive_download_url, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Accept': 'application/vnd.github+json'
        },
        responseType: 'arraybuffer'
      });

      return downloadResponse.data;
    } catch (error) {
      console.error('Failed to download artifact:', error.message);
      throw error;
    }
  }

  /**
   * Recursively walk a directory and return the list of files to push.
   * @param {string} dir - Absolute path to walk
   * @param {string} [prefix=''] - Relative prefix for nested paths
   * @returns {Promise<Array<{path: string, buffer: Buffer}>>} Files (path relative to dir root)
   */
  async collectFiles(dir, prefix = '') {
    const fs = require('fs');
    const path = require('path');
    const results = [];

    if (!fs.existsSync(dir)) {
      throw new Error(`Project directory does not exist: ${dir}`);
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        // Skip build artifacts / regenerable directories that must not be pushed
        if (['node_modules', 'release', 'dist', '.git', '.shell-cache', 'out'].includes(entry.name)) {
          continue;
        }
        results.push(...await this.collectFiles(fullPath, relPath));
      } else if (entry.isFile()) {
        results.push({ path: relPath, buffer: fs.readFileSync(fullPath) });
      }
    }

    return results;
  }

  /**
   * Get the SHA-1 of a git ref.
   * @param {string} ref - ref name, e.g. 'heads/main' or 'tags/v1'
   * @returns {Promise<string>} Commit SHA
   */
  async getRefSha(ref) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/ref/${ref}`;
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    return response.data.object.sha;
  }

  /**
   * Create (or if it exists, force-point) a branch at a given commit SHA.
   * @param {string} branch - Branch name (without 'refs/heads/')
   * @param {string} sha - Commit SHA to point the branch at
   */
  async ensureBranch(branch, sha) {
    const url = `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs`;
    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    try {
      // Try to create the branch
      await axios.post(url, { ref: `refs/heads/${branch}`, sha }, { headers });
      console.log(`✅ Created branch ${branch}`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 422) {
        // Branch already exists — force-point it to the given SHA for a clean push
        const updateUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`;
        await axios.patch(updateUrl, { sha, force: true }, { headers });
        console.log(`✅ Reset existing branch ${branch} to ${sha}`);
      } else {
        throw new Error(`Failed to prepare branch ${branch}: ${err.response?.data?.message || err.message}`);
      }
    }
  }

  /**
   * Push a local folder's contents into the repository (on a dedicated branch) so the
   * GitHub Actions runner actually builds the backend's fully-customized project instead
   * of re-copying the raw generic pos-template.
   *
   * Uses the Git Data API (blobs -> tree on top of the current repo tree -> commit -> ref update).
   *
   * @param {Object} opts
   * @param {string} opts.localPath - Absolute path of the generated project folder on disk
   * @param {string} opts.branch - Branch name to push to (e.g. 'pos-build/pos-restaurant-abc')
   * @param {string} opts.targetDir - Repo-relative directory to place the files under (e.g. 'generated-pos/pos-restaurant-abc')
   * @returns {Promise<{ branch: string, commitSha: string }>}
   */
  async pushProjectToBranch({ localPath, branch, targetDir }) {
    if (!this.token) {
      throw new Error('GITHUB_TOKEN environment variable not set');
    }

    const headers = {
      'Authorization': `Bearer ${this.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    };

    // 1. Collect files (excludes node_modules, release, dist, .git, .shell-cache, out)
    const files = await this.collectFiles(localPath);
    if (files.length === 0) {
      throw new Error(`Nothing to push from ${localPath}`);
    }
    console.log(`Pushing ${files.length} files from ${localPath} to ${branch}:${targetDir}`);

    // 2. Point the branch at the current main head so the rest of the repo is preserved
    const baseBranch = process.env.GITHUB_BASE_BRANCH || 'main';
    const baseSha = await this.getRefSha(`heads/${baseBranch}`);
    await this.ensureBranch(branch, baseSha);

    // 3. Create a blob for every file (base64 is safe for text and binary)
    const blobSizes = [];
    for (const file of files) {
      const blobRes = await axios.post(
        `https://api.github.com/repos/${this.owner}/${this.repo}/git/blobs`,
        { content: file.buffer.toString('base64'), encoding: 'base64' },
        { headers }
      );
      file.sha = blobRes.data.sha;
      blobSizes.push(file.buffer.length);
    }
    const totalBytes = blobSizes.reduce((a, b) => a + b, 0);
    console.log(`Created ${files.length} blobs (${(totalBytes / 1024 / 1024).toFixed(2)} MB)`);

    // 4. Build a tree on top of the current branch tree, adding files under targetDir
    const treeEntries = files.map((f) => ({
      path: `${targetDir}/${f.path}`,
      mode: '100644',
      type: 'blob',
      sha: f.sha
    }));

    const branchHeadSha = await this.getRefSha(`heads/${branch}`);
    const getTreeUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/git/commits/${branchHeadSha}`;
    const branchCommit = await axios.get(getTreeUrl, { headers });
    const baseTreeSha = branchCommit.data.tree.sha;

    const treeRes = await axios.post(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/trees`,
      { base_tree: baseTreeSha, tree: treeEntries },
      { headers }
    );
    const treeSha = treeRes.data.sha;

    // 5. Create a commit for the new tree
    const commitRes = await axios.post(
      `https://api.github.com/repos/${this.owner}/${this.repo}/git/commits`,
      {
        message: `chore(pos): generated project ${targetDir}`,
        tree: treeSha,
        parents: [branchHeadSha]
      },
      { headers }
    );
    const commitSha = commitRes.data.sha;

    // 6. Fast-forward / force the branch to the new commit
    const refUrl = `https://api.github.com/repos/${this.owner}/${this.repo}/git/refs/heads/${branch}`;
    await axios.patch(refUrl, { sha: commitSha, force: true }, { headers });

    console.log(`✅ Pushed generated project to ${branch} (commit ${commitSha})`);
    return { branch, commitSha, files: files.length, bytes: totalBytes };
  }
}

module.exports = GitHubActionsService;
