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
          ref: 'main', // or 'master'
          inputs: {
            project_name: params.projectName,
            license_key: params.licenseKey,
            business_name: params.businessName
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
}

module.exports = GitHubActionsService;
